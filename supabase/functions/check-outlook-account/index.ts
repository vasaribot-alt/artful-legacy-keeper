import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

    const response = await fetch(
      "https://connector-gateway.lovable.dev/microsoft_outlook/me?$select=displayName,mail,userPrincipalName,id",
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": outlookKey,
        },
      },
    );

    if (!response.ok) {
      const details = await response.text();
      console.error(`Outlook identity check failed [${response.status}]: ${details}`);
      return new Response(
        JSON.stringify({ error: "Outlook request failed", status: response.status, details }),
        { status: response.status, headers: jsonHeaders },
      );
    }

    const me = await response.json();
    const address: string | null = me?.mail || me?.userPrincipalName || null;
    const isPersonal = typeof address === "string" && /outlook_[0-9A-F]{16}@outlook\.com$/i.test(address);

    return new Response(
      JSON.stringify({
        success: true,
        displayName: me?.displayName || null,
        address,
        accountType: isPersonal ? "personal" : "work",
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
