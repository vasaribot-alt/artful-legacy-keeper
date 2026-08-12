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

    const { invite_id, sender_name, signature, language } = await req.json();
    const { data: row, error } = await supabase
      .from("artist_invites").select("*, invite_codes(code)").eq("id", invite_id).single();
    if (error || !row) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = (row.invite_codes as any)?.code || "";
    const galleryList: string[] = (row.galleries || []).filter(Boolean);
    const galleries = galleryList.join(", ");
    const primaryGallery = galleryList[0] || "";

    // Has GARF already written to this artist's gallery?
    let galleryContacted = false;
    if (primaryGallery) {
      const { data: g } = await supabase
        .from("galleries").select("id").ilike("name", primaryGallery).limit(1).maybeSingle();
      if (g) {
        const { data: go } = await supabase
          .from("gallery_outreach").select("status").eq("gallery_id", g.id).maybeSingle();
        galleryContacted = !!go && ["sent", "replied", "queued", "joined"].includes(String(go.status));
      }
    }

    const lang = (language || "english").toLowerCase();
    const langInstruction = lang === "english"
      ? "Write in clear, professional English."
      : `Write in ${language}. Use a natural, professional register for that language.`;

    const prompt = `Write a warm, personal invitation email to the contemporary visual artist ${row.artist_name} inviting them to join the Global Artist Registry Foundation (GARF) — an independent Dutch non-profit foundation (stichting) registered in The Hague, building a permanent 100-year archival registry to preserve artist legacies. GARF has no commercial owners, sells nothing and brokers nothing.

Context about the artist (use anything relevant, ignore blanks):
- Country: ${row.country || "unknown"}
- Born: ${row.born || "unknown"}
- Representing galleries: ${galleries || "unknown"}
- Bio: ${row.bio || "unknown"}

${primaryGallery ? `Gallery: mention ${primaryGallery} naturally in the opening — ${galleryContacted
  ? `say that we have also written to ${primaryGallery}, so the invitation does not arrive unannounced.`
  : `say that we are approaching ${primaryGallery} as a Supporting Gallery of GARF, and that this invitation is addressed to the artist directly.`} Make clear that any documentation a gallery shares is only a COPY placed in the artist's own GARF archive — nothing is transferred, and the artist owns the content and can export it at any time.` : ""}

Tone: respectful, concise (200–280 words), personal — reference something specific about their practice if the bio allows. Avoid generic flattery, exclamation marks and marketing superlatives. Explain that GARF is non-commercial, free for life as a Legacy Circle Artist, and serves as an authoritative, independent registry of works for posterity, scholarship and provenance.

${langInstruction}

End with:
- Their personal access code on its own line, exactly: ${code || "(no code on file — omit the code line)"}
- Sign-up link: https://globalartistregistry.org
${signature ? `- Then a short closing line, a blank line, and this signature block VERBATIM (do not translate or reformat):\n---\n${signature}\n---` : `- Signed by: ${sender_name || "Jan S. Kindem"}, Global Artist Registry Foundation`}

Return ONLY the email as plain text. First line must be the subject prefixed with "Subject: ", then a blank line, then the body.`;


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
    const raw: string = data?.choices?.[0]?.message?.content || "";

    let subject = "";
    let body = raw.trim();
    const m = body.match(/^\s*Subject:\s*(.+?)\r?\n([\s\S]*)$/i);
    if (m) {
      subject = m[1].trim();
      body = m[2].trim();
    }
    if (code && !body.includes(code)) {
      body = `${body}\n\nYour personal access code: ${code}\nRedeem it at https://globalartistregistry.org`;
    }

    await supabase.from("artist_invites")
      .update({ email_draft: body, email_subject: subject || null })
      .eq("id", invite_id);

    return new Response(JSON.stringify({ success: true, draft: body, subject, body, code }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
