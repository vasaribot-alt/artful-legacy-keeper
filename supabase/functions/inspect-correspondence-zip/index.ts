import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { unzipSync } from "https://esm.sh/fflate@0.8.2";
import { corsHeaders } from "../_shared/cors.ts";
import { parseRawMessage } from "./mime.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { import_id } = await req.json();
  const { data: imp } = await supabase.from("correspondence_imports").select("storage_path").eq("id", import_id).maybeSingle();
  const { data: file } = await supabase.storage.from("correspondence-originals").download(imp!.storage_path);
  const bytes = new Uint8Array(await file!.arrayBuffer());
  const files = unzipSync(bytes);
  const out: unknown[] = [];
  for (const [name, c] of Object.entries(files)) {
    if (!name.toLowerCase().endsWith(".eml") || name.includes("__MACOSX")) continue;
    const raw = new TextDecoder("iso-8859-1").decode(c as Uint8Array);
    const m = parseRawMessage(raw);
    out.push({ name, subject: m.subject, from: m.fromEmail, date: m.sentAt, bodyLen: m.bodyText.length, atts: m.attachments.length });
    if (out.length >= 5) break;
  }
  return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
