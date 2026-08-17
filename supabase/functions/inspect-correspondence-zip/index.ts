import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { unzipSync } from "https://esm.sh/fflate@0.8.2";
import { corsHeaders } from "../_shared/cors.ts";

// TEMPORARY diagnostic function — safe to delete.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { import_id } = await req.json();
  const { data: imp } = await supabase
    .from("correspondence_imports")
    .select("storage_path, file_name")
    .eq("id", import_id)
    .maybeSingle();
  const { data: file } = await supabase.storage.from("correspondence-originals").download(imp!.storage_path);
  const bytes = new Uint8Array(await file!.arrayBuffer());
  const files = unzipSync(bytes);
  const entries = Object.entries(files).slice(0, 6).map(([name, c]) => {
    const b = c as Uint8Array;
    return {
      name,
      size: b.length,
      firstBytes: Array.from(b.slice(0, 24)),
      head: new TextDecoder("iso-8859-1").decode(b.slice(0, 300)),
    };
  });
  return new Response(JSON.stringify({ names: Object.keys(files).length, entries }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
