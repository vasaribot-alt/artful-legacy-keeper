import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GalleryRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
}

interface LookupResult {
  email: string;
  phone: string;
  website: string;
  contact_name: string;
  contact_title: string;
}

async function lookupGallery(g: GalleryRow, apiKey: string): Promise<LookupResult | null> {
  const prompt = `Find the official public contact information for the art gallery "${g.name}"${
    g.city ? ` in ${g.city}` : ""
  }${g.country ? `, ${g.country}` : ""}. Include, if publicly listed, the name and job title of the most appropriate senior person to contact (director, gallery director, partner, owner or senior director). Return only information you are confident is correct and publicly listed on the gallery's official website. If uncertain, return empty strings.`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a research assistant returning verified public contact info for art galleries. Use the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "gallery_contact",
              description: "Return the gallery's public contact info.",
              parameters: {
                type: "object",
                properties: {
                  email: { type: "string", description: "General public email (info@, contact@, gallery@…), empty if unknown" },
                  phone: { type: "string", description: "Main phone with country code, empty if unknown" },
                  website: { type: "string", description: "Official website URL, empty if unknown" },
                  contact_name: { type: "string", description: "Full name of the most senior appropriate contact person, empty if unknown" },
                  contact_title: { type: "string", description: "That person's job title, e.g. Director, empty if unknown" },
                },
                required: ["email", "phone", "website", "contact_name", "contact_title"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "gallery_contact" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429 || resp.status === 402) {
        throw new Error(`ai_${resp.status}`);
      }
      return null;
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return { email: "", phone: "", website: "", contact_name: "", contact_title: "" };
    const args = JSON.parse(toolCall.function.arguments);
    return {
      email: (args.email || "").trim(),
      phone: (args.phone || "").trim(),
      website: (args.website || "").trim(),
      contact_name: (args.contact_name || "").trim(),
      contact_title: (args.contact_title || "").trim(),
    };
  } catch (e) {
    if (e instanceof Error && (e.message === "ai_429" || e.message === "ai_402")) throw e;
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const body = await req.json().catch(() => ({}));
    const maxRank: number = body.max_rank ?? 1000;
    const batchSize: number = Math.min(body.batch_size ?? 15, 30);
    const concurrency: number = Math.min(body.concurrency ?? 5, 10);

    // Select galleries in top N missing contact info
    const missingContact: boolean = body.missing_contact === true;
    let query = supabase
      .from("galleries")
      .select("id, name, city, country, email, phone, website, contact_name, contact_title")
      .lte("rank", maxRank)
      .not("rank", "is", null);

    query = missingContact
      ? query.is("contact_name", null)
      : query.in("enrichment_status", ["not_attempted"]).or("email.is.null,phone.is.null");

    const { data: pending, error: fetchErr } = await query
      .order("rank", { ascending: true })
      .limit(batchSize);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ done: true, processed: 0, remaining: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark as in-progress to avoid duplicate work if re-invoked
    const ids = pending.map((g) => g.id);
    await supabase.from("galleries").update({
      enrichment_status: "in_progress",
      enrichment_attempted_at: new Date().toISOString(),
    }).in("id", ids);

    let enriched = 0;
    let empty = 0;
    let failed = 0;
    let creditsExhausted = false;

    // Process with concurrency
    const queue = [...pending];
    async function worker() {
      while (queue.length && !creditsExhausted) {
        const g = queue.shift()!;
        let result: LookupResult | null = null;
        try {
          result = await lookupGallery(g as GalleryRow, LOVABLE_API_KEY!);
        } catch (e) {
          if (e instanceof Error && e.message === "ai_402") {
            creditsExhausted = true;
            break;
          }
          if (e instanceof Error && e.message === "ai_429") {
            // brief pause then re-queue
            await new Promise((r) => setTimeout(r, 3000));
            queue.push(g);
            continue;
          }
        }

        if (!result) {
          await supabase.from("galleries").update({
            enrichment_status: "failed",
            enrichment_attempted_at: new Date().toISOString(),
          }).eq("id", g.id);
          failed++;
          continue;
        }

        const updates: Record<string, any> = {
          enrichment_attempted_at: new Date().toISOString(),
        };
        if (result.email && !g.email) updates.email = result.email;
        if (result.phone && !g.phone) updates.phone = result.phone;
        if (result.website && !g.website) updates.website = result.website;
        if (result.contact_name && !(g as any).contact_name) updates.contact_name = result.contact_name;
        if (result.contact_title && !(g as any).contact_title) updates.contact_title = result.contact_title;

        const gotAnything = result.email || result.phone || result.website || result.contact_name;
        updates.enrichment_status = gotAnything ? "enriched" : "no_data";
        if (gotAnything) enriched++; else empty++;

        await supabase.from("galleries").update(updates).eq("id", g.id);
      }
    }

    await Promise.all(Array.from({ length: concurrency }, worker));

    // Reset any still in_progress (in case of credits stop) back to not_attempted
    if (creditsExhausted) {
      await supabase.from("galleries").update({ enrichment_status: "not_attempted" })
        .eq("enrichment_status", "in_progress");
    }

    // Compute remaining
    let remainingQuery = supabase
      .from("galleries")
      .select("*", { count: "exact", head: true })
      .lte("rank", maxRank)
      .not("rank", "is", null);
    remainingQuery = missingContact
      ? remainingQuery.is("contact_name", null)
      : remainingQuery.eq("enrichment_status", "not_attempted");
    const { count: remainingCount } = await remainingQuery;

    return new Response(
      JSON.stringify({
        processed: pending.length,
        enriched,
        no_data: empty,
        failed,
        remaining: remainingCount ?? 0,
        credits_exhausted: creditsExhausted,
        done: (remainingCount ?? 0) === 0 && !creditsExhausted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("enrich-galleries error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
