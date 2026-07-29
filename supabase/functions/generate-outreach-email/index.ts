import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const CATEGORY_GUIDANCE: Record<string, string> = {
  curators:
    "The recipient is a curators' association. Frame GARF as offering their members archival access to verified artist records, provenance, exhibition histories, and installation views — useful for research, exhibition planning, and scholarship. Mention that curators can invite artists to join free of charge as an Allied Curator Partner benefit.",
  art_critics:
    "The recipient is an art critics' association. Frame GARF as an independent, non-commercial reference source for verified artist information, works, exhibitions, and provenance — a citable resource for critical writing.",
  galleries:
    "The recipient is a gallery or gallery association. Frame GARF as a neutral archival registry that complements (does not replace) gallery inventory tools — improving provenance, catalogue raisonné readiness, and long-term legacy for the artists they represent.",
  museums:
    "The recipient is a museum or museum association. Emphasise archival permanence (100-year plan), scholarly reliability, loan/exhibition history tracking, and the willingness-to-lend feature useful for exhibition planning.",
  universities:
    "The recipient is a university, research institute, or academic association. Emphasise scholarly citation, provenance, catalogue raisonné workflows, and open access to verified artist records for research and teaching.",
  foundations:
    "The recipient is an art foundation or artist estate foundation. Emphasise stewardship of legacy, catalogue raisonné support, and permanent archival preservation.",
  corporate_collections:
    "The recipient is a corporate collection or association of corporate collections. Emphasise valuation reporting, insurance-grade documentation, location tracking, and provenance for collected works.",
  registrars:
    "The recipient is a registrars' association. Emphasise professional workflow features — location tracking, inventory, insurance valuation exports, condition & provenance records — and GARF's neutral, non-commercial standing.",
  organisations:
    "The recipient is an umbrella organisation representing many member institutions. Frame the proposal as a framework partnership under which their members can each join individually, and highlight the value across their member base.",
  artist_organisations:
    "The recipient is a national artist organisation (typically an IAA/UNESCO-affiliated national committee). Emphasise GARF's alignment with UNESCO's cultural heritage mission, the free lifetime access for their member artists as Founding Artists, and the value of a permanent, non-commercial archival registry protecting artist legacy across generations.",
  other:
    "The recipient is an allied art-world organisation. Frame the invitation broadly around GARF's archival mission and the mutual benefit of partnership.",
};

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

    const { target_id, sender_name, recipient_capacity, language, signature } = await req.json();
    const { data: row, error } = await supabase
      .from("alliance_outreach_targets").select("*").eq("id", target_id).single();
    if (error || !row) {
      return new Response(JSON.stringify({ error: "Target not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const guidance = CATEGORY_GUIDANCE[row.category] || CATEGORY_GUIDANCE.other;
    const salutation = row.contact_person
      ? `Address the recipient personally as "Dear ${row.contact_person},"`
      : `Address the recipient formally (e.g. "Dear colleagues," or "To the board of ${row.name},")`;
    const lang = (language || "english").toLowerCase();
    const langInstruction = lang === "english"
      ? "Write in clear, professional English."
      : `Write in ${language}. Use natural, professional register for that language.`;

    const prompt = `Write a partnership outreach email on behalf of the Global Artist Registry Foundation (GARF) — a Dutch non-profit foundation (stichting) building a permanent 100-year archival registry to preserve artist legacies. GARF is non-commercial, independent, and museum-grade.

Recipient:
- Organisation: ${row.name}
- Country: ${row.country || "unspecified"}
- Category: ${row.category}
- Contact person: ${row.contact_person || "n/a"}
- Website: ${row.website || "n/a"}
- Internal notes: ${row.notes || "n/a"}

Category-specific framing: ${guidance}

Instructions:
- ${salutation}
- ${langInstruction}
- Length: 180–260 words in the body.
- Tone: respectful, precise, non-salesy. No exclamation marks, no marketing superlatives.
- Structure: (1) why we're writing, (2) what GARF is in one sentence, (3) 2–3 concrete points relevant to their category, (4) a clear, low-commitment ask (a short introductory call or written reply), (5) sign-off.
- Mention UNESCO alignment only if category is artist_organisations, museums, universities, or foundations.
- ${recipient_capacity ? `In the opening sentence, explicitly acknowledge that we are writing to the recipient in their capacity as "${recipient_capacity}" at ${row.name} (e.g. "We are writing to you from the Global Artist Registry Foundation because of your capacity as ${recipient_capacity} of ${row.name}…"). This capacity belongs to the RECIPIENT, not the sender. Never claim the sender holds this role.` : `Do not invent a capacity or title for the recipient. Address them respectfully based on the salutation guidance only.`}
- The sender writes on behalf of "the Global Artist Registry Foundation" without claiming any personal title. Never take a title from the recipient's notes or contact fields — those belong to the recipient.
- Sign the email on separate lines: first line "${sender_name || "The GARF Team"}", second line "Global Artist Registry Foundation".
- Include the website https://globalartistregistry.org near the sign-off.

Return the result as plain text with EXACTLY this format:
Subject: <one-line subject>
<blank line>
<email body>`;

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
      const errText = await res.text();
      console.error("AI error", res.status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed", status: res.status }), {
        status: res.status === 429 || res.status === 402 ? res.status : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content || "";

    // Parse "Subject: ..." + body
    let subject = "";
    let body = raw.trim();
    const m = body.match(/^\s*Subject:\s*(.+?)\r?\n([\s\S]*)$/i);
    if (m) {
      subject = m[1].trim();
      body = m[2].trim();
    }

    await supabase.from("alliance_outreach_targets").update({
      email_subject: subject || null,
      email_body: body || null,
      email_generated_at: new Date().toISOString(),
    }).eq("id", target_id);

    return new Response(JSON.stringify({ success: true, subject, body }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
