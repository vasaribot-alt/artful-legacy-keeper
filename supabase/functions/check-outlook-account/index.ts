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

    const gatewayHeaders = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": outlookKey,
    };

    let displayName: string | null = null;
    let address: string | null = null;

    const profileRes = await fetch(
      "https://connector-gateway.lovable.dev/microsoft_outlook/me?$select=displayName,mail,userPrincipalName,id",
      { headers: gatewayHeaders },
    );

    if (profileRes.ok) {
      const me = await profileRes.json();
      displayName = me?.displayName || null;
      address = me?.mail || me?.userPrincipalName || null;
    } else {
      // Some grants lack User.Read but still allow Mail scopes; derive the mailbox from Graph metadata.
      const details = await profileRes.text();
      console.error(`Outlook profile check failed [${profileRes.status}]: ${details}`);

      const mailRes = await fetch(
        "https://connector-gateway.lovable.dev/microsoft_outlook/me/mailFolders/drafts",
        { headers: gatewayHeaders },
      );
      if (!mailRes.ok) {
        const mailDetails = await mailRes.text();
        console.error(`Outlook mailbox check failed [${mailRes.status}]: ${mailDetails}`);
        return new Response(
          JSON.stringify({ error: "Outlook request failed", status: mailRes.status, details: mailDetails }),
          { status: mailRes.status, headers: jsonHeaders },
        );
      }
      const folder = await mailRes.json();
      const context = folder?.["@odata.context"] as string | undefined;
      const match = context?.match(/users\('([^']+)'\)/);
      if (match) address = decodeURIComponent(match[1]);
    }

    const isPersonal = typeof address === "string" && /outlook_[0-9A-F]{16}@outlook\.com$/i.test(address);

    return new Response(
      JSON.stringify({
        success: true,
        displayName,
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
