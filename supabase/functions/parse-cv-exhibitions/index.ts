import { corsHeaders } from "../_shared/cors.ts";
import { getCallerId } from "../_shared/auth.ts";

interface CvEntry {
  id: string;
  section: string;
  year: string | null;
  entry_text: string;
}

interface ParsedExhibition {
  title: string;
  exhibition_type: "solo" | "group";
  venue: string | null;
  city: string | null;
  country: string | null;
  curator: string | null;
  year: string | null;
  cv_entry_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const callerId = await getCallerId(req);
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { entries } = (await req.json()) as { entries: CvEntry[] };
    if (!entries?.length) {
      return new Response(JSON.stringify({ exhibitions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // Build prompt
    const entriesText = entries
      .map(
        (e, i) =>
          `Entry ${i + 1} [id=${e.id}, section="${e.section}", year="${e.year || ""}"]\n${e.entry_text}`
      )
      .join("\n\n");

    const systemPrompt = `You are a CV parser for visual artists. Given CV exhibition entries, split each entry into individual exhibitions and extract structured data.

Rules:
- Each entry_text may contain MULTIPLE exhibitions concatenated together. Split them into separate records.
- Exhibition titles are usually in quotes like "Title Here". If no quotes, infer the title from venue/context — even a venue name alone is a valid title fallback.
- CRITICAL: Determine exhibition_type STRICTLY from the section name of each entry (provided in the metadata):
  * If the section name contains "solo" (case-insensitive, including singular "Solo Exhibition" or plural "Solo Exhibitions") → exhibition_type MUST be "solo".
  * If the section name contains "group", "selected", "curated", or generic "exhibition(s)" without "solo" → exhibition_type MUST be "group".
  * NEVER default everything to "group". Re-read the section name for EACH entry independently.
- Extract venue/gallery name, city, and country when available.
- Extract curator name if mentioned (usually after "curated by").
- Use the year from the entry metadata.
- Preserve the cv_entry_id from the source entry.

Return ONLY a JSON array of objects with these fields:
{ "title": string, "exhibition_type": "solo"|"group", "venue": string|null, "city": string|null, "country": string|null, "curator": string|null, "year": string|null, "cv_entry_id": string }`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: entriesText },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Extract JSON from response (may be wrapped in ```json blocks)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const exhibitions: ParsedExhibition[] = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : [];

    return new Response(JSON.stringify({ exhibitions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-cv-exhibitions error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
