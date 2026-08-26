import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

const researchSchema = {
  name: "artist_research_workspace",
  description: "Everything that can be found about a visual artist from public web sources",
  parameters: {
    type: "object",
    properties: {
      profile: {
        type: "object",
        description: "Profile fields for the artist",
        properties: {
          biography: { type: ["string", "null"], description: "Factual biography in third person" },
          chronology: { type: ["string", "null"], description: "One line per year: 'YYYY event'" },
          city: { type: ["string", "null"] },
          country: { type: ["string", "null"] },
          birth_year: { type: ["integer", "null"] },
          website: { type: ["string", "null"] },
          galleries: { type: "array", items: { type: "string" } },
          social_links: { type: "object", additionalProperties: { type: "string" } },
        },
        additionalProperties: false,
      },
      cv_entries: {
        type: "array",
        description: "CV lines found in public sources",
        items: {
          type: "object",
          properties: {
            section: {
              type: "string",
              description: "One of: solo_exhibitions, group_exhibitions, awards, collections, education, publications, residencies",
            },
            year: { type: ["string", "null"] },
            text: { type: "string", description: "The CV line, e.g. 'Galerie X, Berlin'" },
            source_url: { type: ["string", "null"] },
          },
          required: ["section", "text"],
          additionalProperties: false,
        },
      },
      artworks: {
        type: "array",
        description: "Individual artworks found, with whatever metadata is stated",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            year: { type: ["integer", "null"] },
            medium: { type: ["string", "null"] },
            height_cm: { type: ["number", "null"] },
            width_cm: { type: ["number", "null"] },
            depth_cm: { type: ["number", "null"] },
            description: { type: ["string", "null"] },
            image_url: { type: ["string", "null"] },
            source_url: { type: ["string", "null"] },
          },
          required: ["title"],
          additionalProperties: false,
        },
      },
      images: {
        type: "array",
        description: "Image URLs worth keeping (artwork photos, installation views, portraits)",
        items: {
          type: "object",
          properties: {
            url: { type: "string" },
            caption: { type: ["string", "null"] },
            source_url: { type: ["string", "null"] },
          },
          required: ["url"],
          additionalProperties: false,
        },
      },
      sources: { type: "array", items: { type: "string" } },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["profile", "cv_entries", "artworks", "images", "sources", "confidence"],
    additionalProperties: false,
  },
};

async function firecrawlScrape(url: string): Promise<string | null> {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: true }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const md = d?.markdown ?? d?.data?.markdown;
    return md ? String(md).slice(0, 12000) : null;
  } catch (_e) {
    return null;
  }
}

async function firecrawlSearch(query: string): Promise<{ text: string; urls: string[] }> {
  if (!FIRECRAWL_API_KEY) return { text: "", urls: [] };
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 6, scrapeOptions: { formats: ["markdown"] } }),
    });
    if (!res.ok) return { text: "", urls: [] };
    const d = await res.json();
    const rows = d?.data ?? [];
    const urls = rows.map((r: { url?: string }) => r.url).filter(Boolean) as string[];
    const text = rows
      .map((r: { url?: string; title?: string; markdown?: string; description?: string }) =>
        `URL: ${r.url}\nTITLE: ${r.title}\n${(r.markdown || r.description || "").slice(0, 4000)}`
      )
      .join("\n\n---\n\n");
    return { text, urls };
  } catch (_e) {
    return { text: "", urls: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let runId: string | null = null;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured" }, 500);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const ownerId: string = body.owner_id || user.id;
    const seedUrls: string[] = Array.isArray(body.urls)
      ? body.urls.map((u: string) => String(u).trim()).filter(Boolean).slice(0, 8)
      : [];
    const hints: string | undefined = body.hints ? String(body.hints).slice(0, 800) : undefined;

    if (ownerId !== user.id) {
      const { data: allowed } = await admin.rpc("has_registrar_access", {
        _registrar_id: user.id,
        _owner_id: ownerId,
      });
      if (!allowed) return json({ error: "Forbidden" }, 403);
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, id_verified, birth_year, city, country, website, biography")
      .eq("user_id", ownerId)
      .maybeSingle();
    if (!profile) return json({ error: "Profile not found" }, 404);
    if (!profile.full_name) {
      return json({ error: "Add the artist's full name first so the research targets the right person." }, 400);
    }

    const { data: run, error: runErr } = await admin
      .from("research_runs")
      .insert({
        owner_id: ownerId,
        created_by: user.id,
        artist_name: profile.full_name,
        seed_urls: seedUrls,
        hints: hints ?? null,
        status: "running",
      })
      .select("id")
      .single();
    if (runErr || !run) return json({ error: runErr?.message || "Could not start research" }, 500);
    runId = run.id;

    // Gather public web context
    const consulted: string[] = [];
    const chunks: string[] = [];

    const startUrls = [...seedUrls];
    if (profile.website && !startUrls.includes(profile.website)) startUrls.unshift(profile.website);

    for (const url of startUrls.slice(0, 6)) {
      const md = await firecrawlScrape(url);
      if (md) {
        consulted.push(url);
        chunks.push(`SOURCE ${url}\n${md}`);
      }
    }

    const search = await firecrawlSearch(
      `"${profile.full_name}" artist ${profile.country || ""} exhibitions gallery works`,
    );
    if (search.text) {
      chunks.push(`WEB SEARCH RESULTS\n${search.text}`);
      consulted.push(...search.urls);
    }

    const context = chunks.join("\n\n=====\n\n").slice(0, 90000);

    const prompt = `Collect everything publicly documented about the visual artist "${profile.full_name}".
Known information (may be incomplete):
${JSON.stringify({
      birth_year: profile.birth_year,
      city: profile.city,
      country: profile.country,
      website: profile.website,
      extra_hints: hints || null,
    }, null, 2)}

${context ? `Material gathered from the artist's own website, gallery websites and public web search:\n${context}` : "No scraped material is available; use only what you reliably know."}

Rules:
- Only report facts that appear in the material or that you are confident are correct. Never invent titles, years, exhibitions, dimensions or contact details.
- Convert dimensions to centimetres. Leave a value null when it is not stated.
- Put each exhibition, award, collection, education or publication line into cv_entries with the year separated out.
- List every individual artwork you find, one entry per work, with the page it came from as source_url.
- Include absolute image URLs only.
- If you cannot confidently identify this person, set confidence to "low" and leave the lists empty.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: "You are a meticulous art-world researcher and archivist. Return only verifiable facts, never fabricate." },
          { role: "user", content: prompt },
        ],
        tools: [{ type: "function", function: researchSchema }],
        tool_choice: { type: "function", function: { name: "artist_research_workspace" } },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI error", res.status, text);
      await admin.from("research_runs").update({ status: "failed", error: `AI ${res.status}`, completed_at: new Date().toISOString() }).eq("id", runId);
      if (res.status === 429) return json({ error: "Rate limit reached, please try again shortly." }, 429);
      if (res.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "AI request failed" }, 502);
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      await admin.from("research_runs").update({ status: "failed", error: "No result", completed_at: new Date().toISOString() }).eq("id", runId);
      return json({ error: "No research result returned" }, 502);
    }
    const result = JSON.parse(call.function.arguments);
    const confidence: string = result.confidence || "medium";

    type Finding = Record<string, unknown>;
    const findings: Finding[] = [];
    const base = { run_id: runId, owner_id: ownerId, confidence };

    const p = result.profile || {};
    const profileFields: { field: string; label: string; value: string | null }[] = [
      { field: "biography", label: "Biography", value: p.biography ?? null },
      { field: "chronology", label: "Chronology", value: p.chronology ?? null },
      { field: "city", label: "City", value: p.city ?? null },
      { field: "country", label: "Country", value: p.country ?? null },
      { field: "birth_year", label: "Year of birth", value: p.birth_year ? String(p.birth_year) : null },
      { field: "website", label: "Website", value: p.website ?? null },
      {
        field: "galleries",
        label: "Galleries",
        value: Array.isArray(p.galleries) && p.galleries.length ? p.galleries.join(", ") : null,
      },
      {
        field: "social_links",
        label: "Social media links",
        value: p.social_links && Object.keys(p.social_links).length
          ? Object.entries(p.social_links as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("\n")
          : null,
      },
    ];
    for (const f of profileFields) {
      if (!f.value) continue;
      findings.push({
        ...base,
        kind: "profile_field",
        field: f.field,
        label: f.label,
        value: f.value,
        payload: f.field === "galleries"
          ? { galleries: p.galleries }
          : f.field === "social_links"
            ? { social_links: p.social_links }
            : { value: p[f.field] },
      });
    }

    for (const e of (result.cv_entries || []).slice(0, 400)) {
      if (!e?.text) continue;
      findings.push({
        ...base,
        kind: "cv_entry",
        field: e.section || "group_exhibitions",
        label: e.year ? `${e.year} · ${e.text}` : e.text,
        value: e.text,
        source_url: e.source_url || null,
        payload: { section: e.section, year: e.year ?? null, text: e.text },
      });
    }

    for (const a of (result.artworks || []).slice(0, 400)) {
      if (!a?.title) continue;
      const parts = [a.year, a.medium, [a.height_cm, a.width_cm, a.depth_cm].filter(Boolean).join(" x ")].filter(Boolean);
      findings.push({
        ...base,
        kind: "artwork",
        label: a.title,
        value: parts.join(" · ") || null,
        source_url: a.source_url || null,
        payload: a,
      });
    }

    for (const img of (result.images || []).slice(0, 200)) {
      if (!img?.url) continue;
      findings.push({
        ...base,
        kind: "image",
        label: img.caption || img.url.split("/").pop() || "Image",
        value: img.url,
        source_url: img.source_url || img.url,
        payload: img,
      });
    }

    if (findings.length) {
      const { error: insErr } = await admin.from("research_findings").insert(findings);
      if (insErr) console.error("findings insert error", insErr);
    }

    const sources = Array.from(new Set([...(result.sources || []), ...consulted])).slice(0, 60);
    await admin.from("research_runs").update({
      status: "completed",
      sources,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);

    return json({ run_id: runId, count: findings.length, confidence, sources });
  } catch (e) {
    console.error("research-artist error", e);
    if (runId) {
      await admin.from("research_runs").update({
        status: "failed",
        error: e instanceof Error ? e.message : "Unknown error",
        completed_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
