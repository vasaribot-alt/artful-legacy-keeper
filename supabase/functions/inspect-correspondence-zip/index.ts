import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { unzipSync } from "https://esm.sh/fflate@0.8.2";
import { corsHeaders } from "../_shared/cors.ts";
import { parseRawMessage } from "./mime.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { import_id } = await req.json();
  const { data: imp } = await supabase.from("correspondence_imports").select("storage_path, owner_id").eq("id", import_id).maybeSingle();
  const { data: file } = await supabase.storage.from("correspondence-originals").download(imp!.storage_path);
  const files = unzipSync(new Uint8Array(await file!.arrayBuffer()));
  const out: unknown[] = [];
  for (const [name, c] of Object.entries(files)) {
    if (!name.toLowerCase().endsWith(".eml") || name.includes("__MACOSX")) continue;
    const m = parseRawMessage(new TextDecoder("iso-8859-1").decode(c as Uint8Array));
    const { data: row, error } = await supabase.from("correspondence_messages").insert({
      owner_id: imp!.owner_id, import_id,
      message_id_header: m.messageIdHeader, thread_key: m.threadKey, sent_at: m.sentAt,
      from_name: m.fromName, from_email: m.fromEmail, to_emails: m.toEmails, cc_emails: m.ccEmails,
      subject: m.subject, body_text: m.bodyText.slice(0, 500_000), has_attachments: m.attachments.length > 0,
    }).select("id").maybeSingle();
    out.push({ name, ok: !!row, error: error ? { code: (error as { code?: string }).code, message: error.message } : null });
    if (row) await supabase.from("correspondence_messages").delete().eq("id", row.id);
    if (out.length >= 3) break;
  }
  return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
