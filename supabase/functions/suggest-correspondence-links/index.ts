import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9åäöæøéèüñ ]+/gi, " ").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const importId = typeof body?.import_id === "string" ? body.import_id : null;

    const [{ data: artworks }, { data: exhibitions }] = await Promise.all([
      supabase.from("artworks").select("id, title, global_artwork_id").eq("owner_id", user.id),
      supabase.from("exhibitions").select("id, title, venue").eq("user_id", user.id),
    ]);

    let msgQuery = supabase
      .from("correspondence_messages")
      .select("id, subject, body_text")
      .eq("owner_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(500);
    if (importId) msgQuery = msgQuery.eq("import_id", importId);
    const { data: messages, error: msgErr } = await msgQuery;
    if (msgErr) throw msgErr;

    const { data: attachments } = await supabase
      .from("correspondence_attachments")
      .select("message_id, file_name")
      .eq("owner_id", user.id)
      .limit(5000);

    const attachmentsByMessage = new Map<string, string[]>();
    for (const a of attachments ?? []) {
      const list = attachmentsByMessage.get(a.message_id) ?? [];
      list.push(norm(a.file_name));
      attachmentsByMessage.set(a.message_id, list);
    }

    const artworkTargets = (artworks ?? [])
      .filter((a) => a.title && norm(a.title).length >= 5)
      .map((a) => ({ id: a.id, needle: norm(a.title), gawid: a.global_artwork_id }));
    const exhibitionTargets = (exhibitions ?? [])
      .filter((e) => e.title && norm(e.title).length >= 5)
      .map((e) => ({ id: e.id, needle: norm(e.title) }));

    const rows: Record<string, unknown>[] = [];

    for (const m of messages ?? []) {
      const haystack = norm(`${m.subject ?? ""} ${m.body_text ?? ""}`);
      const fileNames = attachmentsByMessage.get(m.id) ?? [];

      for (const t of artworkTargets) {
        const inText = haystack.includes(t.needle);
        const inFile = fileNames.some((f) => f.includes(t.needle));
        const byId = t.gawid ? haystack.includes(String(t.gawid)) : false;
        if (!inText && !inFile && !byId) continue;
        rows.push({
          message_id: m.id,
          owner_id: user.id,
          artwork_id: t.id,
          status: "suggested",
          confidence: byId ? 0.95 : inFile ? 0.8 : 0.7,
          reasoning: byId
            ? "Message text contains the artwork's GAWID number"
            : inFile
            ? "An attachment filename matches the artwork title"
            : "Message text mentions the artwork title",
        });
      }

      for (const t of exhibitionTargets) {
        if (!haystack.includes(t.needle) && !fileNames.some((f) => f.includes(t.needle))) continue;
        rows.push({
          message_id: m.id,
          owner_id: user.id,
          exhibition_id: t.id,
          status: "suggested",
          confidence: 0.7,
          reasoning: "Message mentions the exhibition title",
        });
      }
    }

    let created = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabase
        .from("correspondence_links")
        .upsert(chunk, { onConflict: "message_id,artwork_id", ignoreDuplicates: true });
      if (error) {
        // fall back to one-by-one so a single conflict doesn't drop the batch
        for (const row of chunk) {
          const { error: rowErr } = await supabase.from("correspondence_links").insert(row);
          if (!rowErr) created += 1;
        }
        continue;
      }
      created += chunk.length;
    }

    return json({ scanned: messages?.length ?? 0, suggested: created });
  } catch (e) {
    console.error("suggest-correspondence-links error", e);
    return json({ error: e instanceof Error ? e.message : "Unable to suggest links" }, 500);
  }
});
