import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Registers (or refreshes) the Brevo transactional webhook that feeds
// delivery / open / click / bounce events into public.email_send_log.
// Called by a Foundation admin from the Email Log page — the shared secret
// never leaves the server.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";
const EVENTS = [
  "delivered",
  "opened",
  "click",
  "hardBounce",
  "softBounce",
  "blocked",
  "spam",
  "unsubscribed",
  "invalid",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    const backendUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const webhookSecret = Deno.env.get("BREVO_WEBHOOK_SECRET");

    if (!authHeader || !backendUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    if (!lovableApiKey || !brevoApiKey || !webhookSecret) {
      return new Response(JSON.stringify({ error: "Brevo connection not configured." }), { status: 503, headers: jsonHeaders });
    }

    const userClient = createClient(backendUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

    const admin = createClient(backendUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "foundation")) {
      return new Response(JSON.stringify({ error: "Foundation role required" }), { status: 403, headers: jsonHeaders });
    }

    const projectRef = new URL(backendUrl).hostname.split(".")[0];
    const targetUrl = `https://${projectRef}.functions.supabase.co/brevo-events?token=${webhookSecret}`;

    const gwHeaders = {
      "Authorization": `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": brevoApiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    // Reuse an existing webhook pointing at brevo-events if present.
    let existingId: number | null = null;
    const listRes = await fetch(`${GATEWAY_URL}/webhooks?type=transactional`, { headers: gwHeaders });
    if (listRes.ok) {
      const body = await listRes.json();
      const match = (body?.webhooks || []).find((w: { id: number; url: string }) => (w.url || "").includes("/brevo-events"));
      existingId = match?.id ?? null;
    } else {
      console.error(`Brevo webhook list failed [${listRes.status}]: ${await listRes.text()}`);
    }

    const res = existingId
      ? await fetch(`${GATEWAY_URL}/webhooks/${existingId}`, {
        method: "PUT",
        headers: gwHeaders,
        body: JSON.stringify({ url: targetUrl, events: EVENTS, description: "GARF email log tracking" }),
      })
      : await fetch(`${GATEWAY_URL}/webhooks`, {
        method: "POST",
        headers: gwHeaders,
        body: JSON.stringify({ url: targetUrl, events: EVENTS, type: "transactional", description: "GARF email log tracking" }),
      });

    if (!res.ok) {
      const details = await res.text();
      console.error(`Brevo webhook ${existingId ? "update" : "create"} failed [${res.status}]: ${details}`);
      return new Response(JSON.stringify({ error: "Brevo rejected the webhook registration", status: res.status, details }), {
        status: res.status, headers: jsonHeaders,
      });
    }

    console.log(`Brevo webhook ${existingId ? "updated" : "created"} by ${user.id}`);
    return new Response(JSON.stringify({ success: true, updated: !!existingId, events: EVENTS }), { headers: jsonHeaders });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
