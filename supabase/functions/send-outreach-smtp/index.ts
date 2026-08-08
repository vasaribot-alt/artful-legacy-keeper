import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

type Letter = {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
};

const SMTP_HOST = "smtp.domeneshop.no";
const SMTP_PORT = 465;
const IMAP_HOST = "imap.domeneshop.no";
const IMAP_PORT = 993;
// Domeneshop mailboxes expose the sent folder under one of these names.
const SENT_FOLDER_CANDIDATES = ["Sent", "INBOX.Sent", "Sent Items", "INBOX.Sent Items"];

/** Build an RFC 5322 message with both a plain-text and an HTML part. */
function buildMime(from: string, fromName: string, letter: Letter): string {
  const boundary = `garf_${crypto.randomUUID().replace(/-/g, "")}`;
  const text = letter.bodyText || letter.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const encode = (s: string) => `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(s)))}?=`;
  return [
    `From: ${encode(fromName)} <${from}>`,
    `To: ${letter.to}`,
    `Subject: ${encode(letter.subject || "")}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@globalartistregistry.org>`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    letter.bodyHtml,
    ``,
    `--${boundary}--`,
    ``,
  ].join("\r\n");
}

/**
 * Minimal IMAP client that only does what we need: log in and APPEND the sent
 * copy so the user's own Sent folder mirrors what the app sent.
 */
class ImapAppender {
  private conn: Deno.TlsConn | null = null;
  private buf = "";
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private tag = 0;

  async connect(user: string, password: string) {
    this.conn = await Deno.connectTls({ hostname: IMAP_HOST, port: IMAP_PORT });
    await this.readUntil(/\* OK/);
    await this.command(`LOGIN "${user.replace(/"/g, '\\"')}" "${password.replace(/"/g, '\\"')}"`);
  }

  private async readUntil(pattern: RegExp): Promise<string> {
    if (!this.conn) throw new Error("IMAP not connected");
    const chunk = new Uint8Array(8192);
    const deadline = Date.now() + 20000;
    while (!pattern.test(this.buf)) {
      if (Date.now() > deadline) throw new Error("IMAP timeout");
      const n = await this.conn.read(chunk);
      if (n === null) throw new Error("IMAP connection closed");
      this.buf += this.decoder.decode(chunk.subarray(0, n));
    }
    const out = this.buf;
    this.buf = "";
    return out;
  }

  private async write(line: string) {
    if (!this.conn) throw new Error("IMAP not connected");
    await this.conn.write(this.encoder.encode(line));
  }

  private async command(cmd: string): Promise<string> {
    const tag = `a${++this.tag}`;
    await this.write(`${tag} ${cmd}\r\n`);
    const res = await this.readUntil(new RegExp(`^${tag} (OK|NO|BAD)`, "m"));
    if (!new RegExp(`^${tag} OK`, "m").test(res)) throw new Error(res.trim().split("\n").pop() || "IMAP command failed");
    return res;
  }

  /** APPEND with a literal payload; returns the folder that accepted it. */
  async append(folders: string[], mime: string): Promise<string> {
    const bytes = this.encoder.encode(mime).length;
    let lastError = "";
    for (const folder of folders) {
      try {
        const tag = `a${++this.tag}`;
        await this.write(`${tag} APPEND "${folder}" (\\Seen) {${bytes}}\r\n`);
        await this.readUntil(/\+ |^a\d+ (NO|BAD)/m);
        await this.write(`${mime}\r\n`);
        const res = await this.readUntil(new RegExp(`^${tag} (OK|NO|BAD)`, "m"));
        if (new RegExp(`^${tag} OK`, "m").test(res)) return folder;
        lastError = res.trim();
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    throw new Error(lastError || "APPEND failed");
  }

  async close() {
    try {
      await this.command("LOGOUT");
    } catch { /* ignore */ }
    try {
      this.conn?.close();
    } catch { /* ignore */ }
    this.conn = null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    const backendUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const smtpUser = Deno.env.get("DOMENESHOP_SMTP_USER");
    const smtpPassword = Deno.env.get("DOMENESHOP_SMTP_PASSWORD");
    const fromAddress = Deno.env.get("DOMENESHOP_SMTP_FROM");

    if (!authHeader || !backendUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    if (!smtpUser || !smtpPassword || !fromAddress) {
      return new Response(JSON.stringify({ error: "Mail sending is not configured" }), { status: 500, headers: jsonHeaders });
    }

    const userClient = createClient(backendUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

    const adminClient = createClient(backendUrl, serviceKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row) => row.role === "foundation")) {
      console.error("Forbidden: user", user.id, "roles", JSON.stringify(roles));
      return new Response(JSON.stringify({ error: "Your account is missing the Foundation role required to send letters." }), { status: 403, headers: jsonHeaders });
    }

    const payload = await req.json().catch(() => null);
    console.log("send-outreach-smtp invoked by", user.id);
    const letters = Array.isArray(payload?.letters) ? (payload.letters as Letter[]).slice(0, 50) : [];
    const fromName = typeof payload?.fromName === "string" && payload.fromName.trim()
      ? payload.fromName.trim().slice(0, 120)
      : "Global Artist Registry Foundation";
    const dryRun = payload?.dryRun === true;

    if (letters.length === 0) {
      return new Response(JSON.stringify({ error: "No letters supplied" }), { status: 400, headers: jsonHeaders });
    }
    const invalid = letters.find((l) => !l?.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.to) || !l?.bodyHtml);
    if (invalid) {
      return new Response(JSON.stringify({ error: `Invalid letter for "${invalid?.to || "unknown recipient"}"` }), { status: 400, headers: jsonHeaders });
    }

    const client = new SMTPClient({
      connection: { hostname: SMTP_HOST, port: SMTP_PORT, tls: true, auth: { username: smtpUser, password: smtpPassword } },
    });

    // Verify credentials cheaply before touching a real recipient list.
    if (dryRun) {
      try {
        await client.close();
        return new Response(JSON.stringify({ success: true, dryRun: true, from: fromAddress }), { headers: jsonHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "SMTP check failed" }), { status: 502, headers: jsonHeaders });
      }
    }

    const imap = new ImapAppender();
    let imapReady = false;
    let sentFolder: string | null = null;
    try {
      await imap.connect(smtpUser, smtpPassword);
      imapReady = true;
    } catch (e) {
      console.error("IMAP login failed, sending without a Sent copy:", e instanceof Error ? e.message : e);
    }

    const sent: string[] = [];
    const failures: { to: string; error: string }[] = [];

    for (const letter of letters) {
      const mime = buildMime(fromAddress, fromName, letter);
      try {
        await client.send({
          from: `${fromName} <${fromAddress}>`,
          to: letter.to,
          subject: letter.subject || "",
          content: letter.bodyText || letter.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
          html: letter.bodyHtml,
        });
        sent.push(letter.to);
        if (imapReady) {
          try {
            sentFolder = await imap.append(sentFolder ? [sentFolder] : SENT_FOLDER_CANDIDATES, mime);
          } catch (e) {
            console.error("Sent-copy append failed:", e instanceof Error ? e.message : e);
            imapReady = false;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Send failed";
        console.error("SMTP send failed for", letter.to, msg);
        failures.push({ to: letter.to, error: msg });
      }
    }

    try { await client.close(); } catch { /* ignore */ }
    await imap.close();

    return new Response(
      JSON.stringify({
        success: failures.length === 0,
        sent: sent.length,
        recipients: sent,
        from: fromAddress,
        sentFolder,
        savedToSent: Boolean(sentFolder),
        failures,
      }),
      { status: sent.length > 0 ? 200 : 502, headers: jsonHeaders },
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
