import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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

    const { target_ids } = await req.json();
    if (!Array.isArray(target_ids) || target_ids.length === 0) {
      return new Response(JSON.stringify({ error: "target_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ids = target_ids.slice(0, 10);

    const { data: targets, error } = await supabase
      .from("alliance_outreach_targets")
      .select("id, name, country, category, website, contact_person, contact_title, contact_email, notes")
      .in("id", ids);
    if (error || !targets) {
      return new Response(JSON.stringify({ error: error?.message || "Targets not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const t of targets) {
      const prompt = `We are the Global Artist Registry Foundation (a Dutch non-profit stichting) seeking SEED FUNDING and partnership from corporate art collections and their parent organisations.

Identify the best DECISION MAKER to approach at:
- Organisation / collection: ${t.name}
- Country: ${t.country || "unspecified"}
- Website: ${t.website || "unknown"}
- Known contact on file: ${t.contact_person || "none"}${t.contact_title ? ` (${t.contact_title})` : ""}
- Internal notes: ${t.notes || "none"}

Requirements:
- Prefer people with budget authority: CEO / Adm. dir., Chair or Managing Director of the owning foundation, CFO, Group Head of Sustainability/Communications/Brand, Head of Corporate Affairs, Secretary General, or the owner/principal for family collections.
- Explicitly AVOID art advisors, external art consultants, and purely curatorial staff unless no decision maker exists — in that case say so.
- Only state a person's name if you are reasonably confident it is current. If unsure, leave the name empty and instead describe the correct ROLE to ask for, plus a generic corporate/foundation contact route.
- Never invent an email address. Only give an email if it is a publicly published address (personal or the organisation's general/press/foundation address).
- Keep the rationale to 2–3 short sentences and note the confidence level (high / medium / low).`;

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You research corporate decision makers for non-profit fundraising outreach. Be conservative: never fabricate names or emails. Always answer with the provided tool.",
            },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "decision_maker",
              description: "Return the best decision maker to approach",
              parameters: {
                type: "object",
                properties: {
                  person_name: { type: "string", description: "Full name, or empty string if not confident" },
                  person_title: { type: "string", description: "Role/title of the decision maker, or the role to ask for" },
                  email: { type: "string", description: "Publicly published email, or empty string" },
                  website: { type: "string", description: "Official website URL, or empty string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  rationale: { type: "string", description: "2-3 sentences: why this person/role, and how to reach them" },
                },
                required: ["person_name", "person_title", "email", "website", "confidence", "rationale"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "decision_maker" } },
        }),
      });

      if (!res.ok) {
        if (res.status === 429 || res.status === 402) {
          return new Response(JSON.stringify({
            error: res.status === 429 ? "Rate limited — try a smaller batch in a moment." : "AI credits exhausted.",
            results,
          }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        console.error("AI error", res.status, await res.text());
        continue;
      }

      const data = await res.json();
      const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) continue;
      let parsed: any;
      try { parsed = JSON.parse(args); } catch { continue; }

      const research = `Decision maker (AI research, ${new Date().toISOString().slice(0, 10)}) — confidence: ${parsed.confidence}
${parsed.person_name ? `Name: ${parsed.person_name}` : "Name: not confirmed — ask for the role below"}
Role: ${parsed.person_title || "—"}
${parsed.email ? `Email: ${parsed.email}` : ""}
${parsed.rationale || ""}`.trim();

      const patch: Record<string, unknown> = {
        decision_maker_research: research,
        research_at: new Date().toISOString(),
      };
      // Only fill empty fields — never overwrite what the team entered.
      if (parsed.person_name && !t.contact_person) patch.contact_person = parsed.person_name;
      if (parsed.person_title && !t.contact_title) patch.contact_title = parsed.person_title;
      if (parsed.email && !t.contact_email) patch.contact_email = parsed.email;
      if (parsed.website && !t.website) patch.website = parsed.website;

      await supabase.from("alliance_outreach_targets").update(patch).eq("id", t.id);
      results.push({ id: t.id, ...patch });
    }

    return new Response(JSON.stringify({ success: true, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
