import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { outreachEmailHtml } from "../_shared/email-templates/outreach.ts";

type Letter = {
  to: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";
const SENDER_EMAIL = "jan@globalartistregistry.org";
const SENDER_NAME_DEFAULT = "Global Artist Registry Foundation";

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

    if (!authHeader || !backendUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    if (!lovableApiKey || !brevoApiKey) {
      return new Response(JSON.stringify({ error: "Brevo connection not configured. Link the Brevo connector in Settings → Connectors." }), {
        status: 503, headers: jsonHeaders,
      });
    }

    // Verify user + foundation role
    const userClient = createClient(backendUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

    const adminClient = createClient(backendUrl, serviceKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row) => row.role === "foundation")) {
      console.error("Forbidden: user", user.id, "roles", JSON.stringify(roles));
      return new Response(JSON.stringify({ error: "Your account is missing the Foundation role required to send letters." }), {
        status: 403, headers: jsonHeaders,
      });
    }

    const payload = await req.json().catch(() => null);
    console.log("send-outreach-brevo invoked by", user.id);
    const letters = Array.isArray(payload?.letters) ? (payload.letters as Letter[]).slice(0, 50) : [];
    const fromName = typeof payload?.fromName === "string" && payload.fromName.trim()
      ? payload.fromName.trim().slice(0, 120)
      : SENDER_NAME_DEFAULT;
    const campaignTag = typeof payload?.campaignTag === "string" ? payload.campaignTag : "outreach";

    if (letters.length === 0) {
      return new Response(JSON.stringify({ error: "No letters supplied" }), { status: 400, headers: jsonHeaders });
    }
    const invalid = letters.find((l) => !l?.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.to) || !l?.bodyHtml);
    if (invalid) {
      return new Response(JSON.stringify({ error: `Invalid letter for "${invalid?.to || "unknown recipient"}"` }), {
        status: 400, headers: jsonHeaders,
      });
    }

    const sent: string[] = [];
    const failures: { to: string; error: string }[] = [];

    for (const letter of letters) {
      try {
        const brandedHtml = outreachEmailHtml(letter.bodyHtml);
        const res = await fetch(`${GATEWAY_URL}/smtp/email`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "X-Connection-Api-Key": brevoApiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            sender: { name: fromName, email: SENDER_EMAIL },
            to: [{ email: letter.to, name: letter.toName || undefined }],
            subject: letter.subject || "",
            htmlContent: brandedHtml,
            ...(letter.bodyText ? { textContent: letter.bodyText } : {}),
            tags: [campaignTag],
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.error(`Brevo send failed for ${letter.to} [${res.status}]: ${errBody}`);
          failures.push({ to: letter.to, error: `Brevo API ${res.status}: ${errBody.slice(0, 200)}` });
          continue;
        }

        const result = await res.json();
        console.log(`Brevo send OK for ${letter.to}: messageId=${result?.messageId}`);
        sent.push(letter.to);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Send failed";
        console.error("Brevo send error for", letter.to, msg);
        failures.push({ to: letter.to, error: msg });
      }
    }

    return new Response(
      JSON.stringify({
        success: failures.length === 0,
        sent: sent.length,
        recipients: sent,
        from: SENDER_EMAIL,
        provider: "brevo",
        failures,
      }),
      { status: sent.length > 0 ? 200 : 502, headers: jsonHeaders },
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
