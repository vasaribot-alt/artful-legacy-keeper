import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCallerId, callerHasRole } from "../_shared/auth.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const callerId = await getCallerId(req);
    if (!callerId || !(await callerHasRole(callerId, "foundation"))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const storagePath: string = body.storage_path || "galleries-import/Galleries_world_wide_ranked.xlsx";
    // Only admin-controlled import folder may be read, never an arbitrary client path.
    if (!/^galleries-import\/[A-Za-z0-9._\- ]+\.(xlsx|xls|csv)$/.test(storagePath)) {
      return new Response(JSON.stringify({ error: "Invalid storage_path" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const maxRank: number | null = body.max_rank ?? 1000;

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

    const parsed = rows.map((r) => {
      const norm: Record<string, any> = {};
      for (const k of Object.keys(r)) norm[k.trim().toLowerCase()] = r[k];
      const name = String(norm["gallery name"] || norm["name"] || "").trim();
      const yearRaw = norm["establishe year"] ?? norm["established year"] ?? null;
      const rankRaw = norm["rank"] ?? null;
      const y = yearRaw ? parseInt(String(yearRaw)) : null;
      const rk = rankRaw ? parseInt(String(rankRaw)) : null;
      return {
        name,
        country: norm["country"] ? String(norm["country"]).trim() : "",
        city: norm["city"] ? String(norm["city"]).trim() : "",
        established_year: y && !isNaN(y) ? y : "",
        rank: rk && !isNaN(rk) ? rk : "",
        email: norm["email"] ? String(norm["email"]).trim() : "",
        phone: norm["phone"] ? String(norm["phone"]).trim() : "",
      };
    }).filter((g) => g.name);

    const filtered = maxRank
      ? parsed.filter((g) => typeof g.rank === "number" && g.rank <= maxRank)
      : parsed;

    // Single bulk RPC call — DB does all matching in one query
    const { data, error } = await supabase.rpc("bulk_upsert_galleries", {
      _payload: filtered,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = Array.isArray(data) ? data[0] : data;

    return new Response(
      JSON.stringify({
        success: true,
        processed: filtered.length,
        updated: result?.updated_count ?? 0,
        inserted: result?.inserted_count ?? 0,
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
