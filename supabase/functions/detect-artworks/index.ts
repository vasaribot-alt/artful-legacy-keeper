// Detect which catalogued artworks appear in an exhibition's installation views.
// Uses Lovable AI (Gemini vision) to compare each exhibition image against
// the artist's own artwork catalogue thumbnails.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface DetectionMatch {
  artwork_id: string;
  confidence: number;
  reasoning?: string;
  crop?: { x: number; y: number; width: number; height: number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { exhibition_id } = await req.json();
    if (!exhibition_id) return json({ error: "exhibition_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load exhibition + verify access (owner or registrar)
    const { data: ex } = await admin
      .from("exhibitions")
      .select("id, user_id, title")
      .eq("id", exhibition_id)
      .maybeSingle();
    if (!ex) return json({ error: "Exhibition not found" }, 404);

    const ownerId = ex.user_id;
    if (ownerId !== userId) {
      const { data: hasAccess } = await admin.rpc("has_registrar_access", {
        _registrar_id: userId,
        _owner_id: ownerId,
      });
      if (!hasAccess) return json({ error: "Forbidden" }, 403);
    }

    // Load installation view images
    const { data: exImages } = await admin
      .from("exhibition_images")
      .select("id, storage_path, web_storage_path")
      .eq("exhibition_id", exhibition_id);

    if (!exImages || exImages.length === 0) {
      return json({ error: "No installation views to analyze" }, 400);
    }

    // Load artist's catalogue (only verified or owned works)
    const { data: artworks } = await admin
      .from("artworks")
      .select("id, title, year, medium, image_url")
      .eq("owner_id", ownerId);

    if (!artworks || artworks.length === 0) {
      return json({ error: "Artist has no catalogued artworks to compare against" }, 400);
    }

    // Get a thumbnail per artwork (first image)
    const ids = artworks.map((a) => a.id);
    const { data: artImages } = await admin
      .from("artwork_images")
      .select("artwork_id, storage_path, web_storage_path, display_order")
      .in("artwork_id", ids)
      .order("display_order");

    const thumbByArtwork = new Map<string, string>();
    for (const im of artImages ?? []) {
      if (thumbByArtwork.has(im.artwork_id)) continue;
      const path = im.web_storage_path || im.storage_path;
      const bucket = im.web_storage_path ? "artwork-images-web" : "artwork-images";
      const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
      thumbByArtwork.set(im.artwork_id, pub.publicUrl);
    }

    // Catalogue list for prompt — keep all artworks, thumb is optional
    const catalogue = artworks.map((a) => {
      let thumb = thumbByArtwork.get(a.id) || null;
      if (!thumb && a.image_url) {
        thumb = a.image_url.startsWith("http")
          ? a.image_url
          : admin.storage.from("artwork-images").getPublicUrl(a.image_url).data.publicUrl;
      }
      return { id: a.id, title: a.title, year: a.year, medium: a.medium, thumb };
    });

    const withThumb = catalogue.filter((a) => a.thumb).length;
    console.log(`detect-artworks: ${artworks.length} artworks, ${withThumb} with thumbs, ${exImages.length} installation views`);

    if (catalogue.length === 0) {
      return json({ error: "Artist has no artworks to compare against" }, 400);
    }

    // Limit catalogue size per call to avoid huge prompts
    const MAX_CATALOGUE = 60;
    const catalogueSlice = catalogue.slice(0, MAX_CATALOGUE);

    let totalInserted = 0;
    const allMatches: Array<{ exhibition_image_id: string; matches: DetectionMatch[] }> = [];

    // Analyze each installation view independently
    for (const exImg of exImages) {
      const exPath = exImg.web_storage_path || exImg.storage_path;
      const exBucket = exImg.web_storage_path ? "exhibition-images-web" : "exhibition-images";
      const { data: exPub } = admin.storage.from(exBucket).getPublicUrl(exPath);
      const installationUrl = exPub.publicUrl;

      const userContent: Array<Record<string, unknown>> = [
        {
          type: "text",
          text:
            `INSTALLATION VIEW (analyze this photo):\n` +
            `Identify which of the catalogued artworks below appear in this installation photo.\n\n` +
            `CATALOGUE (${catalogueSlice.length} works):\n` +
            catalogueSlice
              .map(
                (a, i) =>
                  `[${i + 1}] id=${a.id} | "${a.title}"${a.year ? ` (${a.year})` : ""}${
                    a.medium ? ` — ${a.medium}` : ""
                  }`,
              )
              .join("\n"),
        },
        { type: "image_url", image_url: { url: installationUrl } },
      ];

      // Append catalogue thumbnails (cap to keep payload reasonable)
      for (const a of catalogueSlice) {
        userContent.push({ type: "image_url", image_url: { url: a.thumb! } });
      }

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content:
                "You are an art-historical visual matching assistant. Compare an installation photograph to a catalogue of an artist's individual works. Identify which catalogued works appear (in whole or part) in the installation photo. Be conservative — only report a match if the visual evidence (composition, palette, marks) clearly corresponds. Provide confidence 0-1 and an approximate normalized bounding box (0-1 coordinates) of where it appears in the installation photo.",
            },
            { role: "user", content: userContent },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_matches",
                description: "Return artworks detected in the installation view.",
                parameters: {
                  type: "object",
                  properties: {
                    matches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          artwork_id: { type: "string", description: "id from the catalogue" },
                          confidence: { type: "number", description: "0..1" },
                          reasoning: { type: "string" },
                          crop: {
                            type: "object",
                            properties: {
                              x: { type: "number" },
                              y: { type: "number" },
                              width: { type: "number" },
                              height: { type: "number" },
                            },
                            required: ["x", "y", "width", "height"],
                          },
                        },
                        required: ["artwork_id", "confidence"],
                      },
                    },
                  },
                  required: ["matches"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "report_matches" } },
        }),
      });

      if (!aiResp.ok) {
        const txt = await aiResp.text();
        console.error("AI error", aiResp.status, txt);
        if (aiResp.status === 429) return json({ error: "Rate limit reached, please try again shortly." }, 429);
        if (aiResp.status === 402) return json({ error: "AI credits exhausted. Add credits in workspace settings." }, 402);
        continue;
      }

      const aiData = await aiResp.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) continue;
      let parsed: { matches: DetectionMatch[] };
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        continue;
      }

      const validIds = new Set(catalogueSlice.map((a) => a.id));
      const cleaned = (parsed.matches || []).filter(
        (m) => validIds.has(m.artwork_id) && m.confidence > 0.4,
      );

      allMatches.push({ exhibition_image_id: exImg.id, matches: cleaned });

      // Insert as suggestions (skip duplicates of pending ones via unique idx)
      for (const m of cleaned) {
        const { error: insErr } = await admin.from("artwork_match_suggestions").insert({
          exhibition_id,
          exhibition_image_id: exImg.id,
          artwork_id: m.artwork_id,
          owner_id: ownerId,
          confidence: m.confidence,
          reasoning: m.reasoning ?? null,
          crop_x: m.crop?.x ?? null,
          crop_y: m.crop?.y ?? null,
          crop_width: m.crop?.width ?? null,
          crop_height: m.crop?.height ?? null,
        });
        if (!insErr) totalInserted++;
      }
    }

    return json({
      ok: true,
      images_analyzed: exImages.length,
      catalogue_size: catalogueSlice.length,
      suggestions_created: totalInserted,
      results: allMatches,
    });
  } catch (e) {
    console.error("detect-artworks error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
