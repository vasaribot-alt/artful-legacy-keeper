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
    "The recipient is a gallery. Frame GARF as a neutral archival registry that complements (does not replace) gallery inventory tools — improving provenance, catalogue raisonné readiness, and long-term legacy for the artists they represent. Invite them to join as a Supporting Gallery of GARF.",
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

    const {
      target_id,
      gallery_id,
      sender_name,
      recipient_capacity,
      contact_person,
      language,
      signature,
      template_subject,
      template_body,
    } = await req.json();

    // Load target: either alliance_outreach_targets or a gallery
    let category = "";
    let name = "";
    let country: string | null = null;
    let website: string | null = null;
    let notes: string | null = null;
    let personName: string | null = contact_person || null;
    let invitedArtists: string | null = null;

    if (gallery_id) {
      const { data: g, error: gErr } = await supabase
        .from("galleries")
        .select("id, name, country, city, website, contact_name, contact_title")
        .eq("id", gallery_id)
        .single();
      if (gErr || !g) {
        return new Response(JSON.stringify({ error: "Gallery not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: o } = await supabase
        .from("gallery_outreach")
        .select("contact_name, contact_title, reply_notes, invited_artists")
        .eq("gallery_id", gallery_id)
        .maybeSingle();
      category = "galleries";
      name = g.name;
      country = [g.city, g.country].filter(Boolean).join(", ") || null;
      website = g.website;
      notes = o?.reply_notes || null;
      invitedArtists = (o as any)?.invited_artists || null;
      personName = personName || o?.contact_name || (g as any).contact_name || null;
    } else {
      const { data: row, error } = await supabase
        .from("alliance_outreach_targets").select("*").eq("id", target_id).single();
      if (error || !row) {
        return new Response(JSON.stringify({ error: "Target not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      category = row.category;
      name = row.name;
      country = row.country;
      website = row.website;
      notes = row.notes;
      personName = personName || row.contact_person;
    }

    const guidance = CATEGORY_GUIDANCE[category] || CATEGORY_GUIDANCE.other;
    const salutation = personName
      ? `Open with the salutation "Dear ${personName}," and then never repeat the recipient's personal name anywhere else in the email.`
      : `Address the recipient formally (e.g. "Dear colleagues," or "To the team at ${name},")`;

    const lang = (language || "english").toLowerCase();
    const langInstruction = template_body
      ? "Write in the same language as the saved email text below — do not translate it."
      : (lang === "english"
        ? "Write in clear, professional English."
        : `Write in ${language}. Use natural, professional register for that language.`);

    const templateInstruction = template_body
      ? `Use the following saved email text as the base and stay as close to it as possible — this is a rewrite, not a new letter.
STRICT RULES for the saved text:
- Write the email in the SAME LANGUAGE as the saved text. Never translate it into another language, and ignore any language instruction that conflicts with the saved text's own language.
- Keep the saved wording, sentence order, paragraph structure and terminology essentially verbatim. Only adapt the salutation and the few recipient-specific details (organisation name, contact person, country).
- Do not add, remove or reorder arguments, and do not add facts that are not in the saved text.
- Keep the same length.

Saved subject: ${template_subject || "(none — derive a concise subject from the body)"}
Saved body:
---
${template_body}
---`
      : "";

    const prompt = `Write a partnership outreach email on behalf of the Global Artist Registry Foundation (GARF) — a Dutch non-profit foundation (stichting) building a permanent 100-year archival registry to preserve artist legacies. GARF is non-commercial, independent, and museum-grade.

Recipient:
- Organisation: ${name}
- Country: ${country || "unspecified"}
- Category: ${category}
- Contact person: ${personName || "n/a"}
- Website: ${website || "n/a"}
- Internal notes: ${notes || "n/a"}
${invitedArtists ? `- Artists represented by this gallery whom GARF is inviting, each with their personal access code:\n${invitedArtists}` : ""}

Category-specific framing: ${guidance}
${invitedArtists ? `\nName the artists listed above in the email and include each artist's personal access code exactly as given, as a clearly formatted list of "Artist name — CODE" lines near the end of the email (before the sign-off), introduced by a short sentence explaining that each code gives that artist free lifetime registration at https://globalartistregistry.org and asking the gallery to pass it on. Copy names and codes verbatim — never alter, shorten or invent a name or code, and if an artist has no code listed, include the name without a code.` : ""}

${templateInstruction}

Instructions:
- ${salutation}
- ${langInstruction}
- Length: 180–260 words in the body.
- Tone: respectful, precise, non-salesy. No exclamation marks, no marketing superlatives.
- Structure: (1) why we're writing, (2) what GARF is in one sentence, (3) 2–3 concrete points relevant to their category, (4) a clear, low-commitment ask (a short introductory call or written reply), (5) sign-off.
- Mention UNESCO alignment only if category is artist_organisations, museums, universities, or foundations.
 - ${recipient_capacity ? `In the opening sentence, acknowledge only the recipient's professional role: "${recipient_capacity}". Write this naturally as "in your capacity as [role] at ${name}". The recipient's personal name must not appear in this sentence or anywhere after the salutation, even if it is included in the capacity text.` : `Do not invent a capacity or title for the recipient. Address them respectfully based on the salutation guidance only.`}
- The sender writes on behalf of "the Global Artist Registry Foundation" without claiming any personal title. Never take a title from the recipient's notes or contact fields — those belong to the recipient.
- ${signature ? `End the email with a short closing line (e.g. "With kind regards,") on its own line, then a blank line, then append the following signature block VERBATIM (do not modify, translate, or reformat any of its lines, including the website and phone numbers):\n---\n${signature}\n---` : `Sign the email on separate lines: first line "${sender_name || "The GARF Team"}", second line "Global Artist Registry Foundation". Include the website https://globalartistregistry.org near the sign-off.`}

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

    let subject = "";
    let body = raw.trim();
    const m = body.match(/^\s*Subject:\s*(.+?)\r?\n([\s\S]*)$/i);
    if (m) {
      subject = m[1].trim();
      body = m[2].trim();
    }

    // The personal name belongs in the salutation only. Enforce this after AI
    // generation so a model cannot repeat it in the opening paragraph.
    if (personName) {
      const escapedName = personName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const lines = body.split(/\r?\n/);
      const salutationIndex = lines.findIndex((line) => line.trim().length > 0);
      body = lines.map((line, index) => {
        if (index === salutationIndex) return line;
        return line
          .replace(new RegExp(escapedName, "gi"), "")
          .replace(/,\s*,/g, ",")
          .replace(/\s{2,}/g, " ")
          .replace(/\s+,/g, ",")
          .trimEnd();
      }).join("\n");
    }

    // Safety net: make sure the invited artists and their access codes are always present.
    if (invitedArtists) {
      const artistLines = invitedArtists
        .split(/\r?\n|;/)
        .map((l) => l.trim())
        .filter(Boolean);
      const missing = artistLines.filter((l) => {
        const code = l.match(/FOUNDING-[A-Z0-9-]+/i)?.[0];
        const nameOnly = l.split("—")[0].split("-")[0].trim();
        return code ? !body.includes(code) : !body.includes(nameOnly);
      });
      if (missing.length) {
        const block = [
          "",
          "The following artists you represent are invited to register with GARF free of charge for life. Each personal access code below can be redeemed at https://globalartistregistry.org — we would be grateful if you could pass them on:",
          "",
          ...artistLines,
          "",
        ].join("\n");
        // Insert before the closing/sign-off if we can find it, otherwise append.
        const closing = body.search(/\n\s*(With kind regards|Kind regards|Yours sincerely|Sincerely|Med vennlig hilsen|Mit freundlichen Grüßen|Bien cordialement|Met vriendelijke groet)/i);
        body = closing > -1
          ? `${body.slice(0, closing)}\n${block}${body.slice(closing)}`
          : `${body}\n${block}`;
      }
    }



    if (gallery_id) {
      // Upsert into gallery_outreach
      const { data: existing } = await supabase
        .from("gallery_outreach").select("id").eq("gallery_id", gallery_id).maybeSingle();
      const payload = {
        email_subject: subject || null,
        email_body: body || null,
        email_generated_at: new Date().toISOString(),
      };
      if (existing) {
        await supabase.from("gallery_outreach").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("gallery_outreach").insert({
          gallery_id, status: "not_contacted", ...payload,
        });
      }
    } else {
      await supabase.from("alliance_outreach_targets").update({
        email_subject: subject || null,
        email_body: body || null,
        email_generated_at: new Date().toISOString(),
      }).eq("id", target_id);
    }

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
