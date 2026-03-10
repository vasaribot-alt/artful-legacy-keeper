import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseMarkdownRow(line: string): { name: string; website: string | null; year: number | null; country: string | null; city: string | null } | null {
  // Format: |[Gallery Name](url)|year|Country|City|Rank|
  const parts = line.split("|").filter(Boolean);
  if (parts.length < 4) return null;

  const nameField = parts[0].trim();
  // Extract name from [Name](url) format
  const nameMatch = nameField.match(/\[([^\]]+)\]\(([^)]+)\)/);
  const name = nameMatch ? nameMatch[1] : nameField;
  const website = nameMatch ? nameMatch[2] : null;

  if (!name || name === "Gallery Name") return null;

  const yearStr = parts[1]?.trim();
  const year = yearStr ? parseInt(yearStr) : null;
  const country = parts[2]?.trim() || null;
  const city = parts[3]?.trim() || null;

  return { name, website, year: (year && !isNaN(year)) ? year : null, country, city };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    let galleries: { name: string; website: string | null; established_year: number | null; country: string | null; city: string | null }[] = [];

    if (body.raw_text) {
      // Parse markdown table text
      const lines = body.raw_text.split("\n");
      for (const line of lines) {
        const parsed = parseMarkdownRow(line);
        if (parsed) {
          galleries.push({
            name: parsed.name,
            website: parsed.website,
            established_year: parsed.year,
            country: parsed.country,
            city: parsed.city,
          });
        }
      }
    } else if (Array.isArray(body.galleries)) {
      galleries = body.galleries.map((g: any) => ({
        name: g.name,
        country: g.country || null,
        city: g.city || null,
        established_year: g.established_year || null,
        website: g.website || null,
      }));
    }

    if (galleries.length === 0) {
      return new Response(JSON.stringify({ error: "No galleries parsed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < galleries.length; i += batchSize) {
      const batch = galleries.slice(i, i + batchSize);
      const { error } = await supabase.from("galleries").insert(batch);
      if (error) {
        console.error("Batch insert error:", error);
        return new Response(JSON.stringify({ error: error.message, inserted }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted += batch.length;
    }

    return new Response(JSON.stringify({ success: true, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
