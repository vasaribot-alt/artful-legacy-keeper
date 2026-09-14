import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCallerId } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMPTY = {
  website: "", phone: "", email: "",
  address: "", city: "", country: "", hours: "", description: "",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const callerId = await getCallerId(req);
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { gallery_name, city, country } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Find the official public information for the art gallery "${gallery_name}"${city ? ` in ${city}` : ""}${country ? `, ${country}` : ""}: website, phone, general email, street address, city, country, opening hours and a one or two sentence factual description of the gallery. Return ONLY information you are confident is publicly listed on the gallery's own website. Use empty strings for anything uncertain.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a research assistant returning verified public information about art galleries. You must respond using the provided tool.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "gallery_contact_info",
              description: "Return the gallery's public information",
              parameters: {
                type: "object",
                properties: {
                  website: { type: "string", description: "Official website URL, empty if unknown" },
                  phone: { type: "string", description: "Phone number including country code, empty if unknown" },
                  email: { type: "string", description: "General public email address, empty if unknown" },
                  address: { type: "string", description: "Street address including postal code, empty if unknown" },
                  city: { type: "string", description: "City, empty if unknown" },
                  country: { type: "string", description: "Country, empty if unknown" },
                  hours: { type: "string", description: "Opening hours as a short single line, e.g. 'Tue to Sat, 10am to 6pm', empty if unknown" },
                  description: { type: "string", description: "One or two factual sentences about the gallery, empty if unknown" },
                },
                required: ["website", "phone", "email", "address", "city", "country", "hours", "description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "gallery_contact_info" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      const out: Record<string, string> = { ...EMPTY };
      for (const k of Object.keys(EMPTY)) out[k] = String(args[k] ?? "").trim();
      return new Response(JSON.stringify(out), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(EMPTY), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gallery-lookup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
