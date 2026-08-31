import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendRawEmail } from "../_shared/send-raw-email.ts";

type Letter = {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
};

const SENDER_DOMAIN = "notify.globalartistregistry.org";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    const backendUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!authHeader || !backendUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
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

    if (letters.length === 0) {
      return new Response(JSON.stringify({ error: "No letters supplied" }), { status: 400, headers: jsonHeaders });
    }
    const invalid = letters.find((l) => !l?.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.to) || !l?.bodyHtml);
    if (invalid) {
      return new Response(JSON.stringify({ error: `Invalid letter for "${invalid?.to || "unknown recipient"}"` }), { status: 400, headers: jsonHeaders });
    }

    const queued: string[] = [];
    const failures: { to: string; error: string }[] = [];

    const logSend = async (
      to: string,
      status: "sent" | "suppressed" | "failed",
      errorMessage?: string,
    ) => {
      const { error } = await adminClient.from("email_send_log").insert({
        template_name: "gallery_outreach",
        recipient_email: to,
        status,
        error_message: errorMessage ?? null,
      });
      if (error) console.error("Failed to write email_send_log", error.code, error.message);
    };

    for (const letter of letters) {
      try {
        const result = await sendRawEmail({
          to: letter.to,
          subject: letter.subject || "",
          html: letter.bodyHtml,
          text: letter.bodyText,
          label: "gallery_outreach",
          fromName,
          fromLocalPart: "outreach",
        });

        if (!result.sent) {
          await logSend(letter.to, "suppressed");
          failures.push({ to: letter.to, error: "Recipient has unsubscribed or previously bounced" });
          continue;
        }

        await logSend(letter.to, "sent");
        queued.push(letter.to);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Send failed";
        console.error("Email send failed for", letter.to, msg);
        await logSend(letter.to, "failed", msg);
        failures.push({ to: letter.to, error: msg });
      }
    }

    return new Response(
      JSON.stringify({
        success: failures.length === 0,
        queued: queued.length,
        recipients: queued,
        from: `outreach@${SENDER_DOMAIN}`,
        failures,
      }),
      { status: queued.length > 0 ? 200 : 502, headers: jsonHeaders },
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
