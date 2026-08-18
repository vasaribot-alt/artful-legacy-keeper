// Minimal, dependency-free RFC 5322 / MIME reader for archival email ingest.
// Works on a latin1 ("binary") string of the raw message so that base64 and
// quoted-printable payloads survive intact before decoding.

export interface ParsedAttachment {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface ParsedMessage {
  messageIdHeader: string | null;
  threadKey: string | null;
  sentAt: string | null;
  fromName: string | null;
  fromEmail: string | null;
  toEmails: string[];
  ccEmails: string[];
  subject: string | null;
  bodyText: string;
  attachments: ParsedAttachment[];
}

const latin1ToBytes = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};

const bytesToText = (bytes: Uint8Array, charset?: string): string => {
  const labels = [charset, "utf-8", "iso-8859-1"].filter(Boolean) as string[];
  for (const label of labels) {
    try {
      return new TextDecoder(label, { fatal: false }).decode(bytes);
    } catch {
      // unknown charset label — try the next one
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
};

const decodeQuotedPrintable = (s: string): Uint8Array => {
  const joined = s.replace(/=(?:\r\n|\n|\r)/g, "");
  const out: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    const ch = joined[i];
    if (ch === "=" && /^[0-9A-Fa-f]{2}$/.test(joined.substr(i + 1, 2))) {
      out.push(parseInt(joined.substr(i + 1, 2), 16));
      i += 2;
    } else {
      out.push(ch.charCodeAt(0) & 0xff);
    }
  }
  return new Uint8Array(out);
};

const decodeBase64 = (s: string): Uint8Array => {
  const clean = s.replace(/[^A-Za-z0-9+/=]/g, "");
  if (!clean) return new Uint8Array();
  try {
    const bin = atob(clean);
    return latin1ToBytes(bin);
  } catch {
    return new Uint8Array();
  }
};

const decodeTransfer = (body: string, encoding: string): Uint8Array => {
  const enc = (encoding || "").toLowerCase();
  if (enc === "base64") return decodeBase64(body);
  if (enc === "quoted-printable") return decodeQuotedPrintable(body);
  return latin1ToBytes(body);
};

// RFC 2047 encoded words in header values: =?utf-8?B?...?= / =?iso-8859-1?Q?...?=
export const decodeHeaderWords = (value: string): string =>
  value.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (_m, charset: string, kind: string, payload: string) => {
      const bytes = kind.toUpperCase() === "B"
        ? decodeBase64(payload)
        : decodeQuotedPrintable(payload.replace(/_/g, " "));
      return bytesToText(bytes, charset);
    },
  );

const splitHeadersBody = (raw: string): [string, string] => {
  const idx = (() => {
    const a = raw.indexOf("\r\n\r\n");
    const b = raw.indexOf("\n\n");
    if (a === -1) return b === -1 ? -1 : [b, 2] as const;
    if (b === -1) return [a, 4] as const;
    return a < b ? [a, 4] as const : [b, 2] as const;
  })();
  if (idx === -1) return [raw, ""];
  const [pos, len] = idx as readonly [number, number];
  return [raw.slice(0, pos), raw.slice(pos + len)];
};

type Headers = Record<string, string>;

const parseHeaders = (block: string): Headers => {
  const unfolded = block.replace(/\r?\n[ \t]+/g, " ");
  const headers: Headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9-]+):\s?([\s\S]*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    headers[key] = headers[key] ? `${headers[key]}, ${m[2]}` : m[2];
  }
  return headers;
};

const paramOf = (headerValue: string, name: string): string | null => {
  const quoted = headerValue.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  if (quoted) return quoted[1];
  const bare = headerValue.match(new RegExp(`${name}\\s*=\\s*([^;\\s]+)`, "i"));
  return bare ? bare[1] : null;
};

interface Collected {
  text: string[];
  html: string[];
  attachments: ParsedAttachment[];
}

const walkPart = (raw: string, depth: number, acc: Collected) => {
  if (depth > 12) return;
  const [headerBlock, body] = splitHeadersBody(raw);
  const headers = parseHeaders(headerBlock);
  const contentType = headers["content-type"] || "text/plain";
  const mime = contentType.split(";")[0].trim().toLowerCase();
  const encoding = headers["content-transfer-encoding"] || "";
  const disposition = headers["content-disposition"] || "";
  const fileName = paramOf(disposition, "filename") || paramOf(contentType, "name");

  if (mime.startsWith("multipart/")) {
    const boundary = paramOf(contentType, "boundary");
    if (!boundary) return;
    const marker = `--${boundary}`;
    const segments = body.split(new RegExp(`^${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(--)?\\s*$`, "m"));
    // segments[0] is the preamble
    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      if (!seg || !seg.trim()) continue;
      walkPart(seg.replace(/^\r?\n/, ""), depth + 1, acc);
    }
    return;
  }

  if (fileName) {
    acc.attachments.push({
      fileName: decodeHeaderWords(fileName),
      mimeType: mime || "application/octet-stream",
      bytes: decodeTransfer(body, encoding),
    });
    return;
  }

  if (mime === "text/plain") {
    acc.text.push(bytesToText(decodeTransfer(body, encoding), paramOf(contentType, "charset") ?? undefined));
    return;
  }

  if (mime === "text/html" && acc.text.length === 0) {
    const html = bytesToText(decodeTransfer(body, encoding), paramOf(contentType, "charset") ?? undefined);
    acc.text.push(
      html
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    );
    return;
  }

  // Any other inline part with a payload is kept as an unnamed attachment
  if (body.trim() && mime !== "text/plain") {
    acc.attachments.push({
      fileName: `part-${acc.attachments.length + 1}`,
      mimeType: mime || "application/octet-stream",
      bytes: decodeTransfer(body, encoding),
    });
  }
};

const parseAddressList = (value: string | undefined): { name: string | null; email: string }[] => {
  if (!value) return [];
  const out: { name: string | null; email: string }[] = [];
  // split on commas that are not inside quotes
  const parts = value.match(/(?:"[^"]*"|[^,])+/g) || [];
  for (const part of parts) {
    const raw = decodeHeaderWords(part.trim());
    if (!raw) continue;
    const angled = raw.match(/^(.*?)<([^>]+)>$/);
    if (angled) {
      const name = angled[1].trim().replace(/^"|"$/g, "").trim();
      out.push({ name: name || null, email: angled[2].trim().toLowerCase() });
    } else if (/\S+@\S+/.test(raw)) {
      out.push({ name: null, email: raw.replace(/[<>]/g, "").trim().toLowerCase() });
    }
  }
  return out;
};

const normalizeSubject = (subject: string | null): string | null => {
  if (!subject) return null;
  const cleaned = subject
    .replace(/^(\s*(re|fw|fwd|aw|sv|vs|antw|rif)\s*(\[\d+\])?\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();
  return cleaned || null;
};

export const parseRawMessage = (raw: string): ParsedMessage => {
  const [headerBlock] = splitHeadersBody(raw);
  const headers = parseHeaders(headerBlock);
  const acc: Collected = { text: [], attachments: [] };
  walkPart(raw, 0, acc);

  const from = parseAddressList(headers["from"])[0] ?? null;
  const to = parseAddressList(headers["to"]).map((a) => a.email);
  const cc = parseAddressList(headers["cc"]).map((a) => a.email);
  const subject = headers["subject"] ? decodeHeaderWords(headers["subject"]).trim() : null;

  let sentAt: string | null = null;
  if (headers["date"]) {
    const d = new Date(headers["date"].replace(/\s*\([^)]*\)\s*$/, ""));
    if (!isNaN(d.getTime())) sentAt = d.toISOString();
  }

  const references = (headers["references"] || "").match(/<[^>]+>/g);
  const inReplyTo = (headers["in-reply-to"] || "").match(/<[^>]+>/);
  const messageId = (headers["message-id"] || "").match(/<[^>]+>/)?.[0] ?? null;

  const threadKey =
    references?.[0] ??
    inReplyTo?.[0] ??
    (normalizeSubject(subject) ? `subject:${normalizeSubject(subject)}` : messageId);

  return {
    messageIdHeader: messageId,
    threadKey,
    sentAt,
    fromName: from?.name ?? null,
    fromEmail: from?.email ?? null,
    toEmails: to,
    ccEmails: cc,
    subject,
    bodyText: acc.text.join("\n\n").trim(),
    attachments: acc.attachments.filter((a) => a.bytes.length > 0),
  };
};

/** Splits an mbox stream into raw message strings. */
export const splitMbox = (raw: string): string[] => {
  const lines = raw.split(/\r?\n/);
  const messages: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/^From .+\d{4}$/.test(line) || /^From \S+@\S+ /.test(line)) {
      if (current.length) messages.push(current.join("\n"));
      current = [];
      continue;
    }
    // mbox ">From " unescaping
    current.push(line.replace(/^>(>*From )/, "$1"));
  }
  if (current.length) messages.push(current.join("\n"));
  return messages.filter((m) => m.trim().length > 0);
};

export const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
