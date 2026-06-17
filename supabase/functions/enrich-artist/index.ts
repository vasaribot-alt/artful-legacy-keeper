import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

interface EnrichedArtist {
  born?: number | null;
  died?: number | null;
  country?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  studio_address?: string | null;
  galleries?: string[];
  social_links?: Record<string, string>;
  website?: string | null;
  bio?: string | null;
  cv_text?: string | null;
  ranking?: string | null;
  sources?: string[];
}

const enrichmentSchema = {
  name: "artist_research",
  description: "Structured biographical and career data for a contemporary visual artist",
  parameters: {
    type: "object",
    properties: {
      born: { type: ["integer", "null"], description: "Year of birth" },
      died: { type: ["integer", "null"], description: "Year of death, null if living" },
      country: { type: ["string", "null"], description: "Country of nationality or primary residence" },
      city: { type: ["string", "null"], description: "Primary city of residence/studio" },
      email: { type: ["string", "null"], description: "Publicly listed contact email (studio, agent, or representative); null if unknown" },
      phone: { type: ["string", "null"] },
      studio_address: { type: ["string", "null"] },
      website: { type: ["string", "null"], description: "Official artist website URL" },
      galleries: {
        type: "array",
        items: { type: "string" },
        description: "Names of currently representing galleries",
      },
      social_links: {
        type: "object",
        description: "Object mapping platform name (instagram, twitter, facebook, linkedin, etc) to URL",
        additionalProperties: { type: "string" },
      },
      bio: { type: ["string", "null"], description: "Short biographical paragraph (3-5 sentences)" },
      cv_text: { type: ["string", "null"], description: "Compact CV-style list of major exhibitions, awards, collections" },
      ranking: { type: ["string", "null"], description: "ArtFacts ranking or notable market/critical standing if known" },
      sources: { type: "array", items: { type: "string" }, description: "URLs consulted" },
    },
    required: ["galleries", "social_links", "sources"],
    additionalProperties: false,
  },
};

async function enrichWithGemini(name: string, hints: Record<string, unknown>): Promise<EnrichedArtist | null> {
  if (!LOVABLE_API_KEY) return null;

  const prompt = `Research the contemporary visual artist named "${name}".
Known information (may be incomplete or empty):
${JSON.stringify(hints, null, 2)}

Find publicly available biographical and career information. Return a structured JSON with the artist's birth/death years, country, city, official website, representing galleries, social media links (Instagram, Facebook, Twitter/X, LinkedIn), a short bio, and a compact CV of major exhibitions/awards. Only include data you are confident about — leave fields null if unsure. Do not fabricate contact details.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a meticulous art-world researcher. Return only verifiable facts." },
        { role: "user", content: prompt },
      ],
      tools: [{ type: "function", function: enrichmentSchema }],
      tool_choice: { type: "function", function: { name: "artist_research" } },
    }),
  });

  if (!res.ok) {
    console.error("Gemini error", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return null;
  try {
    return JSON.parse(call.function.arguments) as EnrichedArtist;
  } catch (e) {
    console.error("Parse error", e);
    return null;
  }
}

async function firecrawlFallback(name: string): Promise<Partial<EnrichedArtist> | null> {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${name} contemporary artist gallery website biography`,
        limit: 5,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const sources: string[] = (data?.data || []).map((d: any) => d.url).filter(Boolean);
    const combined = (data?.data || [])
      .map((d: any) => `URL: ${d.url}\nTITLE: ${d.title}\n${(d.markdown || d.description || "").slice(0, 2000)}`)
      .join("\n\n---\n\n");

    // Re-ask Gemini using the scraped context
    if (!combined || !LOVABLE_API_KEY) return { sources };

    const res2 = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Extract structured artist data from the provided web search results. Only use facts present in the sources." },
          { role: "user", content: `Artist: ${name}\n\nSearch results:\n${combined}` },
        ],
        tools: [{ type: "function", function: enrichmentSchema }],
        tool_choice: { type: "function", function: { name: "artist_research" } },
      }),
    });
    if (!res2.ok) return { sources };
    const d2 = await res2.json();
    const call = d2?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return { sources };
    const parsed = JSON.parse(call.function.arguments) as EnrichedArtist;
    return { ...parsed, sources: [...(parsed.sources || []), ...sources] };
  } catch (e) {
    console.error("Firecrawl error", e);
    return null;
  }
}

function isSparse(r: EnrichedArtist | null): boolean {
  if (!r) return true;
  const filled = [r.born, r.country, r.bio, r.website, r.galleries?.length, Object.keys(r.social_links || {}).length]
    .filter(Boolean).length;
  return filled < 3;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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

    const { invite_id } = await req.json();
    if (!invite_id) {
      return new Response(JSON.stringify({ error: "invite_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row, error: fetchErr } = await supabase
      .from("artist_invites").select("*").eq("id", invite_id).single();
    if (fetchErr || !row) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("artist_invites").update({ enrichment_status: "running" }).eq("id", invite_id);

    const hints = {
      born: row.born, died: row.died, country: row.country, city: row.city,
      email: row.email, galleries: row.galleries, notes: row.notes,
    };

    let result = await enrichWithGemini(row.artist_name, hints);
    let usedFallback = false;
    if (isSparse(result)) {
      const fb = await firecrawlFallback(row.artist_name);
      if (fb) {
        usedFallback = true;
        result = { ...(result || {}), ...fb, sources: [...(result?.sources || []), ...(fb.sources || [])] };
      }
    }

    if (!result) {
      await supabase.from("artist_invites").update({ enrichment_status: "failed" }).eq("id", invite_id);
      return new Response(JSON.stringify({ error: "Enrichment returned no data" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Merge — preserve existing non-empty values
    const merged: Record<string, unknown> = {
      born: row.born ?? result.born ?? null,
      died: row.died ?? result.died ?? null,
      country: row.country || result.country || null,
      city: row.city || result.city || null,
      email: row.email || result.email || null,
      phone: row.phone || result.phone || null,
      studio_address: row.studio_address || result.studio_address || null,
      website: row.website || result.website || null,
      galleries: (row.galleries && row.galleries.length) ? row.galleries : (result.galleries || []),
      social_links: { ...(result.social_links || {}), ...((row.social_links as object) || {}) },
      bio: row.bio || result.bio || null,
      cv_text: row.cv_text || result.cv_text || null,
      ranking: row.ranking || result.ranking || null,
      enrichment_status: "completed",
      enriched_at: new Date().toISOString(),
      enrichment_sources: { urls: result.sources || [], used_firecrawl: usedFallback },
    };

    const { error: updErr } = await supabase.from("artist_invites").update(merged).eq("id", invite_id);
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, enriched: merged, used_firecrawl: usedFallback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
