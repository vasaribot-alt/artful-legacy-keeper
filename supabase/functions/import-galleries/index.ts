import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    if (body.from_storage) {
      // Download XLSX from storage and parse
      const { data: fileData, error: dlError } = await supabase.storage
        .from("artwork-documents")
        .download("galleries-import/Galleries_world_wide.xlsx");

      if (dlError || !fileData) {
        return new Response(JSON.stringify({ error: "Failed to download file: " + (dlError?.message || "unknown") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      galleries = rows.map((row: any) => {
        const name = row["Gallery Name"] || row["Name"] || "";
        const country = row["Country"] || null;
        const city = row["City"] || null;
        const yearRaw = row["Establishe Year"] || row["Established Year"] || null;
        const established_year = yearRaw ? parseInt(String(yearRaw)) : null;
        return { name, country, city, established_year: (established_year && !isNaN(established_year)) ? established_year : null, website: null };
      }).filter((g) => g.name);
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
