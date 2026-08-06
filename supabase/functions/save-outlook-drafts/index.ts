import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type Draft = {
  to: string;
  subject: string;
  bodyHtml: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const authHeader = req.headers.get("Authorization");
    const backendUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const outlookKey = Deno.env.get("MICROSOFT_OUTLOOK_API_KEY");
    if (!authHeader || !backendUrl || !anonKey || !serviceKey || !lovableKey || !outlookKey) {
      return new Response(JSON.stringify({ error: "Outlook is not configured" }), { status: 401, headers: jsonHeaders });
    }

    const userClient = createClient(backendUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

    const adminClient = createClient(backendUrl, serviceKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row) => row.role === "foundation")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: jsonHeaders });
    }

    const payload = await req.json();
    const drafts = Array.isArray(payload?.drafts) ? payload.drafts.slice(0, 50) as Draft[] : [];
    if (drafts.length === 0) {
      return new Response(JSON.stringify({ error: "No drafts supplied" }), { status: 400, headers: jsonHeaders });
    }

    let saved = 0;
    const failures: { to: string; error: string }[] = [];
    for (const draft of drafts) {
      if (!draft?.to || !draft?.bodyHtml) {
        failures.push({ to: draft?.to || "Unknown recipient", error: "Missing recipient or body" });
        continue;
      }
      const response = await fetch("https://connector-gateway.lovable.dev/microsoft_outlook/me/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": outlookKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: draft.subject || "",
          body: { contentType: "HTML", content: draft.bodyHtml },
          toRecipients: [{ emailAddress: { address: draft.to } }],
        }),
      });
      if (response.ok) {
        saved += 1;
      } else {
        const details = await response.text();
        console.error(`Outlook draft failed [${response.status}]: ${details}`);
        failures.push({ to: draft.to, error: `Outlook returned ${response.status}` });
      }
    }

    return new Response(JSON.stringify({ success: failures.length === 0, saved, failures }), {
      status: saved > 0 ? 200 : 502,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});