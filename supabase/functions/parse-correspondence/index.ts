import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { unzipSync } from "https://esm.sh/fflate@0.8.2";
import { corsHeaders } from "../_shared/cors.ts";
import { parseRawMessage, splitMbox, sha256Hex, type ParsedMessage } from "./mime.ts";

const MAX_PER_CALL = 120;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

interface Filters {
  date_from?: string | null;
  date_to?: string | null;
  exclude_emails?: string[];
  exclude_domains?: string[];
  skip_attachments?: boolean;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** macOS zips carry AppleDouble resource forks (__MACOSX/._name.eml) — never real mail. */
const isJunkEntry = (name: string): boolean => {
  const n = name.toLowerCase();
  const base = n.split("/").pop() ?? n;
  return n.includes("__macosx/") || base.startsWith("._") || base === ".ds_store" || base === "";
};

const rawMessagesFromFile = (fileName: string, bytes: Uint8Array): string[] => {
  const lower = fileName.toLowerCase();
  const latin1 = new TextDecoder("iso-8859-1").decode(bytes);

  if (lower.endsWith(".zip")) {
    const files = unzipSync(bytes);
    const out: string[] = [];
    const kept: string[] = [];
    const dropped: string[] = [];
    for (const [name, content] of Object.entries(files)) {
      const n = name.toLowerCase();
      if (n.endsWith("/") || isJunkEntry(n)) { dropped.push(name); continue; }
      if (!n.endsWith(".eml") && !n.endsWith(".mbox") && !n.endsWith(".txt")) { dropped.push(name); continue; }
      kept.push(name);
      const text = new TextDecoder("iso-8859-1").decode(content as Uint8Array);
      if (n.endsWith(".mbox")) out.push(...splitMbox(text));
      else out.push(text);
    }
    console.log("zip entries", JSON.stringify({ kept: kept.slice(0, 40), dropped: dropped.slice(0, 40), keptCount: kept.length, droppedCount: dropped.length }));
    return out;
  }

  if (lower.endsWith(".mbox") || /^From .+\r?\n/.test(latin1)) return splitMbox(latin1);
  return [latin1];
};


/** Without a sender, subject, date or Message-ID this is not a mail message (resource forks, stray binaries). */
const isEmptyMessage = (msg: ParsedMessage): boolean =>
  !msg.fromEmail && !msg.subject && !msg.sentAt && !msg.messageIdHeader;

const excluded = (msg: ParsedMessage, filters: Filters): boolean => {
  const addresses = [msg.fromEmail, ...msg.toEmails, ...msg.ccEmails].filter(Boolean) as string[];
  const emails = (filters.exclude_emails ?? []).map((e) => e.toLowerCase().trim()).filter(Boolean);
  const domains = (filters.exclude_domains ?? []).map((d) => d.toLowerCase().trim().replace(/^@/, "")).filter(Boolean);

  if (emails.length && addresses.some((a) => emails.includes(a))) return true;
  if (domains.length && addresses.some((a) => domains.some((d) => a.endsWith(`@${d}`)))) return true;

  if (msg.sentAt) {
    const t = new Date(msg.sentAt).getTime();
    if (filters.date_from && t < new Date(filters.date_from).getTime()) return true;
    if (filters.date_to && t > new Date(filters.date_to).getTime()) return true;
  }
  return false;
};

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
    const action = body?.action === "ingest" ? "ingest" : "analyze";
    const offset = Number.isFinite(body?.offset) ? Math.max(0, Math.floor(body.offset)) : 0;
    const filters: Filters = typeof body?.filters === "object" && body.filters ? body.filters : {};
    if (!importId) return json({ error: "import_id is required" }, 400);

    const { data: imp, error: impErr } = await supabase
      .from("correspondence_imports")
      .select("id, owner_id, file_name, storage_path, attachment_bytes, ingested_count")
      .eq("id", importId)
      .maybeSingle();
    if (impErr) throw impErr;
    if (!imp || imp.owner_id !== user.id) return json({ error: "Import not found" }, 404);

    const { data: file, error: dlErr } = await supabase.storage
      .from("correspondence-originals")
      .download(imp.storage_path);
    if (dlErr || !file) throw dlErr ?? new Error("Could not read the uploaded file");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const raws = rawMessagesFromFile(imp.file_name, bytes);
    const total = raws.length;
    const slice = raws.slice(offset, offset + MAX_PER_CALL);

    // ---------- ANALYZE ----------
    if (action === "analyze") {
      const correspondents: Record<string, number> = {};
      let attachmentBytes = 0;
      let attachmentCount = 0;
      let minDate: string | null = null;
      let maxDate: string | null = null;
      let undated = 0;

      for (const raw of slice) {
        const msg = parseRawMessage(raw);
        if (isEmptyMessage(msg)) continue;
        for (const addr of [msg.fromEmail, ...msg.toEmails].filter(Boolean) as string[]) {
          correspondents[addr] = (correspondents[addr] ?? 0) + 1;
        }
        for (const att of msg.attachments) {
          attachmentBytes += att.bytes.length;
          attachmentCount += 1;
        }
        if (msg.sentAt) {
          if (!minDate || msg.sentAt < minDate) minDate = msg.sentAt;
          if (!maxDate || msg.sentAt > maxDate) maxDate = msg.sentAt;
        } else undated += 1;
      }

      const processedTo = offset + slice.length;
      const done = processedTo >= total;

      // Diagnostics: what did the reader actually see?
      const samples = slice.slice(0, 3).map((r) => r.slice(0, 300));
      console.log("analyze diagnostics", JSON.stringify({
        file: imp.file_name,
        total,
        samples,
      }));


      if (done) {
        await supabase
          .from("correspondence_imports")
          .update({ status: "parsed", message_count: total })
          .eq("id", importId);
      }

      return json({
        action,
        total,
        processed_to: processedTo,
        done,
        summary: { correspondents, attachment_bytes: attachmentBytes, attachment_count: attachmentCount, min_date: minDate, max_date: maxDate, undated },
      });
    }

    // ---------- INGEST ----------
    let inserted = 0;
    let skipped = 0;
    let skippedEmpty = 0;
    let skippedFiltered = 0;
    let skippedDuplicate = 0;
    let attachmentBytes = 0;
    let minDate: string | null = null;
    let maxDate: string | null = null;
    const warnings: string[] = [];

    // Quota check once per chunk
    const { data: statusRows } = await supabase.rpc("get_user_storage_status", { _user_id: user.id });
    const quota = statusRows?.[0] ? Number(statusRows[0].quota_bytes) : 0;
    const used = statusRows?.[0] ? Number(statusRows[0].used_bytes) : 0;
    let overQuota = quota > 0 && used >= quota;
    if (overQuota) warnings.push("Storage quota reached — attachments were not stored.");

    for (const raw of slice) {
      const msg = parseRawMessage(raw);
      if (isEmptyMessage(msg)) { skipped += 1; skippedEmpty += 1; continue; }
      if (excluded(msg, filters)) { skipped += 1; skippedFiltered += 1; continue; }


      const { data: row, error: insErr } = await supabase
        .from("correspondence_messages")
        .insert({
          owner_id: user.id,
          import_id: importId,
          message_id_header: msg.messageIdHeader,
          thread_key: msg.threadKey,
          sent_at: msg.sentAt,
          from_name: msg.fromName,
          from_email: msg.fromEmail,
          to_emails: msg.toEmails,
          cc_emails: msg.ccEmails,
          subject: msg.subject,
          body_text: msg.bodyText.slice(0, 500_000),
          has_attachments: msg.attachments.length > 0,
        })
        .select("id")
        .maybeSingle();

      if (insErr) {
        // duplicate message-id → already archived
        if ((insErr as { code?: string }).code === "23505" || /duplicate key/i.test(insErr.message)) {
          skipped += 1;
          skippedDuplicate += 1;
          continue;
        }
        throw insErr;
      }
      if (!row) { skipped += 1; continue; }
      inserted += 1;
      if (msg.sentAt) {
        if (!minDate || msg.sentAt < minDate) minDate = msg.sentAt;
        if (!maxDate || msg.sentAt > maxDate) maxDate = msg.sentAt;
      }

      if (filters.skip_attachments) continue;

      for (const att of msg.attachments) {
        if (overQuota) break;
        if (att.bytes.length > MAX_ATTACHMENT_BYTES) {
          warnings.push(`Attachment too large, skipped: ${att.fileName}`);
          continue;
        }
        const hash = await sha256Hex(att.bytes);
        const { data: existing } = await supabase
          .from("correspondence_attachments")
          .select("storage_path")
          .eq("owner_id", user.id)
          .eq("sha256", hash)
          .limit(1)
          .maybeSingle();

        let path = existing?.storage_path as string | undefined;
        if (!path) {
          path = `${user.id}/${hash.slice(0, 2)}/${hash}`;
          const { error: upErr } = await supabase.storage
            .from("correspondence-attachments")
            .upload(path, att.bytes, { contentType: att.mimeType, upsert: true });
          if (upErr) {
            warnings.push(`Could not store attachment ${att.fileName}: ${upErr.message}`);
            continue;
          }
          attachmentBytes += att.bytes.length;
          if (quota > 0 && used + attachmentBytes >= quota) {
            overQuota = true;
            warnings.push("Storage quota reached during import — remaining attachments were skipped.");
          }
        }

        await supabase.from("correspondence_attachments").insert({
          message_id: row.id,
          owner_id: user.id,
          file_name: att.fileName,
          mime_type: att.mimeType,
          file_size: att.bytes.length,
          sha256: hash,
          storage_path: path,
        });
      }
    }

    const processedTo = offset + slice.length;
    const done = processedTo >= total;

    const { data: current } = await supabase
      .from("correspondence_imports")
      .select("ingested_count, attachment_bytes, date_from, date_to")
      .eq("id", importId)
      .maybeSingle();

    const nextFrom = minDate && (!current?.date_from || minDate < current.date_from) ? minDate : current?.date_from ?? null;
    const nextTo = maxDate && (!current?.date_to || maxDate > current.date_to) ? maxDate : current?.date_to ?? null;

    await supabase
      .from("correspondence_imports")
      .update({
        status: done ? "ingested" : "ingesting",
        message_count: total,
        ingested_count: (current?.ingested_count ?? 0) + inserted,
        attachment_bytes: Number(current?.attachment_bytes ?? 0) + attachmentBytes,
        date_from: nextFrom,
        date_to: nextTo,
      })
      .eq("id", importId);

    return json({
      action,
      total,
      processed_to: processedTo,
      done,
      inserted,
      skipped,
      skipped_empty: skippedEmpty,
      skipped_filtered: skippedFiltered,
      skipped_duplicate: skippedDuplicate,
      attachment_bytes: attachmentBytes,
      warnings,
    });
  } catch (e) {
    console.error("parse-correspondence error", e);
    return json({ error: e instanceof Error ? e.message : "Unable to parse correspondence" }, 500);
  }
});
