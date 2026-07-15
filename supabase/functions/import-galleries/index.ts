import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GalleryRow {
  name: string;
  country: string | null;
  city: string | null;
  established_year: number | null;
  rank: number | null;
  email: string | null;
  phone: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const storagePath: string = body.storage_path || "galleries-import/Galleries_world_wide_ranked.xlsx";
    const maxRank: number | null = body.max_rank ?? 1000;

    // Download from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from("artwork-documents")
      .download(storagePath);

    if (dlError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Download failed: " + (dlError?.message || "unknown") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buf = await fileData.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const parsed: GalleryRow[] = rows.map((r) => {
      const norm: Record<string, any> = {};
      for (const k of Object.keys(r)) norm[k.trim().toLowerCase()] = r[k];
      const name = String(norm["gallery name"] || norm["name"] || "").trim();
      const yearRaw = norm["establishe year"] ?? norm["established year"] ?? null;
      const rankRaw = norm["rank"] ?? null;
      const y = yearRaw ? parseInt(String(yearRaw)) : null;
      const rk = rankRaw ? parseInt(String(rankRaw)) : null;
      return {
        name,
        country: norm["country"] ? String(norm["country"]).trim() : null,
        city: norm["city"] ? String(norm["city"]).trim() : null,
        established_year: y && !isNaN(y) ? y : null,
        rank: rk && !isNaN(rk) ? rk : null,
        email: norm["email"] ? String(norm["email"]).trim() : null,
        phone: norm["phone"] ? String(norm["phone"]).trim() : null,
      };
    }).filter((g) => g.name);

    const filtered = maxRank
      ? parsed.filter((g) => g.rank !== null && g.rank <= maxRank)
      : parsed;

    let updated = 0;
    let inserted = 0;
    const errors: string[] = [];

    for (const g of filtered) {
      // Try to match by lower(name) + lower(city)
      const nameLower = g.name.toLowerCase().trim();
      const cityLower = (g.city || "").toLowerCase().trim();

      const { data: matches, error: findErr } = await supabase
        .from("galleries")
        .select("id, city")
        .ilike("name", g.name);

      if (findErr) {
        errors.push(`${g.name}: ${findErr.message}`);
        continue;
      }

      const exact = (matches || []).find(
        (m: any) =>
          (m.city || "").toLowerCase().trim() === cityLower ||
          (!m.city && !g.city),
      );

      if (exact) {
        const { error: updErr } = await supabase
          .from("galleries")
          .update({
            rank: g.rank,
            email: g.email,
            phone: g.phone,
            country: g.country,
            city: g.city,
            established_year: g.established_year,
          })
          .eq("id", exact.id);
        if (updErr) errors.push(`${g.name}: update ${updErr.message}`);
        else updated++;
      } else {
        const { error: insErr } = await supabase.from("galleries").insert({
          name: g.name,
          country: g.country,
          city: g.city,
          established_year: g.established_year,
          rank: g.rank,
          email: g.email,
          phone: g.phone,
        });
        if (insErr) errors.push(`${g.name}: insert ${insErr.message}`);
        else inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: filtered.length,
        updated,
        inserted,
        error_count: errors.length,
        errors: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
