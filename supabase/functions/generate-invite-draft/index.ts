import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized or missing AI key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "foundation")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invite_id, sender_name } = await req.json();
    const { data: row, error } = await supabase
      .from("artist_invites").select("*, invite_codes(code)").eq("id", invite_id).single();
    if (error || !row) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = (row.invite_codes as any)?.code || "";
    const galleries = (row.galleries || []).join(", ");

    const prompt = `Write a warm, personal invitation email to the contemporary visual artist ${row.artist_name} inviting them to join the Global Artist Registry Foundation (GARF) — a Dutch non-profit foundation building a permanent 100-year archival registry to preserve artist legacies.

Context about the artist (use anything relevant, ignore blanks):
- Country: ${row.country || "unknown"}
- Born: ${row.born || "unknown"}
- Representing galleries: ${galleries || "unknown"}
- Bio: ${row.bio || "unknown"}

Tone: respectful, concise (under 250 words), personal — reference something specific about their practice if the bio allows. Avoid generic flattery. Explain that GARF is non-commercial, free for founding artists, and serves as an authoritative, independent registry of works for posterity, scholarship, and provenance.

End with:
- Their personal invite code: ${code}
- Sign-up link: https://globalartistregistry.org
- Signed by: ${sender_name || "The GARF Team"}

Return ONLY the email body as plain text. Include a Subject line as the first line prefixed with "Subject: ".`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const draft = data?.choices?.[0]?.message?.content || "";

    await supabase.from("artist_invites").update({ email_draft: draft }).eq("id", invite_id);

    return new Response(JSON.stringify({ success: true, draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
