import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const draftSchema = {
  name: "artist_profile_draft",
  description: "Draft profile fields for a visual artist, based only on publicly available information",
  parameters: {
    type: "object",
    properties: {
      biography: { type: ["string", "null"], description: "Biography, 4-8 sentences, factual, third person" },
      chronology: { type: ["string", "null"], description: "Year-by-year list of significant life/career events, one per line as 'YYYY — event'" },
      city: { type: ["string", "null"] },
      country: { type: ["string", "null"] },
      birth_year: { type: ["integer", "null"] },
      website: { type: ["string", "null"] },
      galleries: { type: "array", items: { type: "string" }, description: "Representing gallery names" },
      social_links: {
        type: "object",
        description: "Platform name (instagram, facebook, x, linkedin, youtube) mapped to URL",
        additionalProperties: { type: "string" },
      },
      sources: { type: "array", items: { type: "string" }, description: "URLs consulted" },
      confidence: { type: "string", enum: ["high", "medium", "low"], description: "How confident the research is that this is the right person" },
    },
    required: ["galleries", "social_links", "sources", "confidence"],
    additionalProperties: false,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, id_verified, birth_year, city, country, website, biography")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return json({ error: "Profile not found" }, 404);
    if (!profile.id_verified) {
      return json({ error: "AI profile assistance becomes available after ID verification." }, 403);
    }
    if (!profile.full_name) {
      return json({ error: "Add your full name first so the research targets the right person." }, 400);
    }
    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured" }, 500);

    const { hints } = await req.json().catch(() => ({ hints: undefined }));

    const prompt = `Research the visual artist "${profile.full_name}".
Known information (may be incomplete):
${JSON.stringify({
      birth_year: profile.birth_year,
      city: profile.city,
      country: profile.country,
      website: profile.website,
      extra_hints: hints || null,
    }, null, 2)}

Draft profile content from publicly available sources only. Write the biography in neutral, factual third person — no marketing language. Leave any field null if you are not confident. Never invent exhibitions, galleries, awards, or contact details. If you cannot confidently identify this person, set confidence to "low" and leave fields null.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a meticulous art-world researcher. Return only verifiable facts and never fabricate." },
          { role: "user", content: prompt },
        ],
        tools: [{ type: "function", function: draftSchema }],
        tool_choice: { type: "function", function: { name: "artist_profile_draft" } },
      }),
    });

    if (res.status === 429) return json({ error: "Rate limit reached, please try again shortly." }, 429);
    if (res.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!res.ok) {
      console.error("AI error", res.status, await res.text());
      return json({ error: "AI request failed" }, 502);
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "No draft returned" }, 502);

    const draft = JSON.parse(call.function.arguments);
    return json({ draft });
  } catch (e) {
    console.error("draft-my-profile error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
