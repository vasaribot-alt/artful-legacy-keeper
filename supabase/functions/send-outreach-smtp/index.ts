import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

    for (const letter of letters) {
      try {
        const messageId = crypto.randomUUID();
        await adminClient.from("email_send_log").insert({
          message_id: messageId,
          template_name: "gallery_outreach",
          recipient_email: letter.to,
          status: "pending",
        });
        const { error: enqueueError } = await adminClient.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            to: letter.to,
            from: `${fromName} <outreach@${SENDER_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: letter.subject || "",
            html: letter.bodyHtml,
            text: letter.bodyText,
            purpose: "transactional",
            label: "gallery_outreach",
            idempotency_key: messageId,
            queued_at: new Date().toISOString(),
          },
        });
        if (enqueueError) {
          await adminClient.from("email_send_log").insert({
            message_id: messageId,
            template_name: "gallery_outreach",
            recipient_email: letter.to,
            status: "failed",
            error_message: enqueueError.message,
          });
          throw enqueueError;
        }
        queued.push(letter.to);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Queue failed";
        console.error("Email queue failed for", letter.to, msg);
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
