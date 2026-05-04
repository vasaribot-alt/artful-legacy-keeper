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
const DEFAULT_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 1;
const CATALOGUE_CHUNK_SIZE = 10;
const MAX_VERIFICATION_CANDIDATES = 6;
const MIN_CANDIDATE_CONFIDENCE = 0.78;
const MIN_VERIFICATION_CONFIDENCE = 0.9;
const INSTALLATION_TRANSFORM = { width: 1400, quality: 72 };
const THUMB_TRANSFORM = { width: 320, height: 320, resize: "contain", quality: 55 } as const;

interface DetectionMatch {
  artwork_id: string;
  confidence: number;
  reasoning?: string;
  crop?: { x: number; y: number; width: number; height: number };
}

interface CatalogueArtwork {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
  thumb: string | null;
}

class AiRequestError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`AI request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

function getPublicImageUrl(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
  transform?: { width?: number; height?: number; quality?: number; resize?: "cover" | "contain" | "fill" },
) {
  return admin.storage.from(bucket).getPublicUrl(path, transform ? { transform } : undefined).data.publicUrl;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function parseToolMatches(rawText: string, exImgId: string) {
  if (!rawText || !rawText.trim()) {
    console.warn("AI returned empty body for image", exImgId);
    return [] as DetectionMatch[];
  }

  let aiData: any;
  try {
    aiData = JSON.parse(rawText);
  } catch {
    console.warn("AI returned non-JSON body for image", exImgId, rawText.slice(0, 200));
    return [] as DetectionMatch[];
  }

  const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return [] as DetectionMatch[];

  try {
    const parsed = JSON.parse(toolCall.function.arguments) as { matches?: DetectionMatch[] };
    return parsed.matches || [];
  } catch {
    return [] as DetectionMatch[];
  }
}

async function requestMatches(
  installationUrl: string,
  catalogueSlice: CatalogueArtwork[],
  exImgId: string,
  instruction: string,
  systemPrompt: string,
) {
  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text:
        `${instruction}\n\n` +
        `You will receive images in this exact order:\n` +
        `Image 1 = installation view.\n` +
        `Images 2..${catalogueSlice.length + 1} = labelled catalogue candidates.\n\n` +
        `Catalogue candidates:\n` +
        catalogueSlice
          .map(
            (a, i) =>
              `[${i + 1}] id=${a.id} | "${a.title}"${a.year ? ` (${a.year})` : ""}${a.medium ? ` — ${a.medium}` : ""}`,
          )
          .join("\n"),
    },
    { type: "image_url", image_url: { url: installationUrl } },
  ];

  for (let i = 0; i < catalogueSlice.length; i++) {
    const artwork = catalogueSlice[i];
    if (!artwork.thumb) continue;
    userContent.push({
      type: "text",
      text: `[${i + 1}] "${artwork.title}"${artwork.year ? ` (${artwork.year})` : ""} — id=${artwork.id}`,
    });
    userContent.push({ type: "image_url", image_url: { url: artwork.thumb } });
  }

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
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
    throw new AiRequestError(aiResp.status, txt);
  }

  return parseToolMatches(await aiResp.text(), exImgId);
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

    const body = await req.json().catch(() => null);
    const exhibition_id = body?.exhibition_id;
    const rawOffset = Number(body?.offset ?? 0);
    const rawBatchSize = Number(body?.batch_size ?? DEFAULT_BATCH_SIZE);
    const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;
    const batchSize = Number.isFinite(rawBatchSize)
      ? Math.min(MAX_BATCH_SIZE, Math.max(1, Math.floor(rawBatchSize)))
      : DEFAULT_BATCH_SIZE;

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

    // Load a small batch of installation view images so each invocation stays fast.
    const { data: exImages, count: totalImages, error: exImagesError } = await admin
      .from("exhibition_images")
      .select("id, storage_path, web_storage_path", { count: "exact" })
      .eq("exhibition_id", exhibition_id)
      .order("display_order")
      .range(offset, offset + batchSize - 1);

    if (exImagesError) throw exImagesError;

    if ((totalImages ?? 0) === 0) {
      return json({ error: "No installation views to analyze" }, 400);
    }

    if (!exImages || exImages.length === 0) {
      return json({
        ok: true,
        images_analyzed: 0,
        images_total: totalImages ?? 0,
        images_processed_until: offset,
        has_more: false,
        next_offset: null,
        suggestions_created: 0,
        results: [],
      });
    }

    // Load artist's catalogue (only verified or owned works)
    const { data: artworks } = await admin
      .from("artworks")
      .select("id, title, year, medium, image_url")
      .eq("owner_id", ownerId);

    if (!artworks || artworks.length === 0) {
      return json({ error: "Artist has no catalogued artworks to compare against" }, 400);
    }

    // Get a thumbnail per artwork (first image). Chunk the .in() filter so the
    // PostgREST URL never exceeds the gateway limit (440+ UUIDs blow past it).
    const ids = artworks.map((a) => a.id);
    const thumbByArtwork = new Map<string, string>();
    const CHUNK = 100;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { data: artImages, error: artImagesErr } = await admin
        .from("artwork_images")
        .select("artwork_id, storage_path, web_storage_path, display_order")
        .in("artwork_id", slice)
        .order("display_order", { nullsFirst: false });
      if (artImagesErr) {
        console.error("artwork_images query error", artImagesErr);
        continue;
      }
      for (const im of artImages ?? []) {
        if (thumbByArtwork.has(im.artwork_id)) continue;
        const path = im.web_storage_path || im.storage_path;
        if (!path) continue;
        const bucket = im.web_storage_path ? "artwork-images-web" : "artwork-images";
        thumbByArtwork.set(im.artwork_id, getPublicImageUrl(admin, bucket, path, THUMB_TRANSFORM));
      }
    }

    // Catalogue list for prompt — keep all artworks, thumb is optional
    const catalogue = artworks.map((a) => {
      let thumb = thumbByArtwork.get(a.id) || null;
      if (!thumb && a.image_url) {
        thumb = a.image_url.startsWith("http")
          ? a.image_url
          : getPublicImageUrl(admin, "artwork-images", a.image_url, THUMB_TRANSFORM);
      }
      return { id: a.id, title: a.title, year: a.year, medium: a.medium, thumb };
    });

    const withThumb = catalogue.filter((a) => a.thumb).length;
    console.log(`detect-artworks: ${artworks.length} artworks, ${withThumb} with thumbs, ${exImages.length} installation views`);

    if (catalogue.length === 0) {
      return json({ error: "Artist has no artworks to compare against" }, 400);
    }

    // Prioritise artworks that actually have a thumbnail — without an image the
    // model can only match on title text, which is useless for visual detection.
    const catalogueSlice = [...catalogue]
      .sort((a, b) => (a.thumb ? 0 : 1) - (b.thumb ? 0 : 1))
      .slice(0, MAX_CATALOGUE);

    let totalInserted = 0;
    const allMatches: Array<{ exhibition_image_id: string; matches: DetectionMatch[] }> = [];

    console.log(
      `detect-artworks batch: offset ${offset}, processing ${exImages.length}/${totalImages ?? exImages.length} installation views, ${artworks.length} artworks, ${withThumb} with thumbs`,
    );

    // Analyze each installation view independently
    for (const exImg of exImages) {
      const exPath = exImg.web_storage_path || exImg.storage_path;
      const exBucket = exImg.web_storage_path ? "exhibition-images-web" : "exhibition-images";
      const installationUrl = getPublicImageUrl(admin, exBucket, exPath, INSTALLATION_TRANSFORM);

      const userContent: Array<Record<string, unknown>> = [
        {
          type: "text",
          text:
            `TASK: Identify which catalogued artworks appear in the installation photograph.\n\n` +
            `You will receive images IN THIS EXACT ORDER:\n` +
            `  Image 1 = the INSTALLATION VIEW (a gallery photo with one or more works on the wall).\n` +
            `  Images 2..${catalogueSlice.filter((a) => a.thumb).length + 1} = CATALOGUE THUMBNAILS, each labelled [1], [2], [3]... matching the list below.\n\n` +
            `CATALOGUE (${catalogueSlice.length} works — use the bracket number to refer back):\n` +
            catalogueSlice
              .map(
                (a, i) =>
                  `[${i + 1}] id=${a.id} | "${a.title}"${a.year ? ` (${a.year})` : ""}${
                    a.medium ? ` — ${a.medium}` : ""
                  }`,
              )
              .join("\n") +
            `\n\nMETHOD (follow strictly):\n` +
            `1. Look at the installation view. For each artwork visible on the wall, write a short visual description: dominant colours, shapes/motifs, any text or numbers, composition.\n` +
            `2. For EACH visible work, scan ALL catalogue thumbnails. Compare colours, motifs, text, and composition — NOT just the general series style. Many catalogue works look superficially similar; you must discriminate between them.\n` +
            `3. Only report a match when the SAME painting is clearly present — same dominant colour field, same motifs in the same positions, same text/numbers if any. If the installation crop is too small or blurry to be sure which specific work it is, DO NOT guess — omit it.\n` +
            `4. NEVER pick a catalogue work just because it belongs to the same series. A wrong-but-same-series match is worse than no match.\n` +
            `5. Confidence scale: 0.95+ = identical work clearly visible; 0.75 = strong match with minor uncertainty; <0.75 = do not report.\n` +
            `6. The 'reasoning' field MUST cite the specific visual evidence ("yellow background, blue '79' digits, green diagonal stripe at lower right — matches catalogue [12]"). Generic reasoning like "pyramid shape on white" is not acceptable.`,
        },
        { type: "image_url", image_url: { url: installationUrl } },
      ];

      // Append catalogue thumbnails with index labels so the model can ground choices.
      for (let i = 0; i < catalogueSlice.length; i++) {
        const a = catalogueSlice[i];
        if (!a.thumb) continue;
        userContent.push({
          type: "text",
          text: `[${i + 1}] "${a.title}"${a.year ? ` (${a.year})` : ""} — id=${a.id}`,
        });
        userContent.push({ type: "image_url", image_url: { url: a.thumb } });
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
                "You are a rigorous art-historical visual matching assistant. Your job is to discriminate between visually similar works in the SAME series — not to recognise the series itself. A confident wrong answer is the worst possible outcome; omitting an uncertain match is correct behaviour. Always justify matches with specific visible evidence (colours, motifs, numbers, composition).",
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

        if (aiResp.status === 429) {
          return json({ error: "Rate limit reached, please try again shortly." }, 429);
        }

        if (aiResp.status === 402) {
          return json({
            ok: false,
            fallback: true,
            code: "AI_CREDITS_EXHAUSTED",
            error: "AI credits exhausted. Add credits in workspace settings.",
            images_analyzed: allMatches.length,
            images_total: totalImages ?? exImages.length,
            images_processed_until: offset + allMatches.length,
            has_more: true,
            next_offset: offset + allMatches.length,
            batch_size: batchSize,
            catalogue_size: catalogueSlice.length,
            suggestions_created: totalInserted,
            results: allMatches,
          });
        }

        if (aiResp.status === 413) {
          return json({
            ok: false,
            fallback: true,
            code: "AI_IMAGE_PAYLOAD_TOO_LARGE",
            error: "Detection payload was still too large for AI processing. I reduced image sizes further — please run it again.",
            images_analyzed: allMatches.length,
            images_total: totalImages ?? exImages.length,
            images_processed_until: offset + allMatches.length,
            has_more: true,
            next_offset: offset + allMatches.length,
            batch_size: batchSize,
            catalogue_size: catalogueSlice.length,
            suggestions_created: totalInserted,
            results: allMatches,
          });
        }

        continue;
      }

      const rawText = await aiResp.text();
      if (!rawText || !rawText.trim()) {
        console.warn("AI returned empty body for image", exImg.id);
        continue;
      }
      let aiData: any;
      try {
        aiData = JSON.parse(rawText);
      } catch (e) {
        console.warn("AI returned non-JSON body for image", exImg.id, rawText.slice(0, 200));
        continue;
      }
      const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) continue;
      let parsed: { matches: DetectionMatch[] };
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        continue;
      }

      const validIds = new Set(catalogueSlice.map((a) => a.id));
      const cleaned = (parsed.matches || []).filter(
        (m) => validIds.has(m.artwork_id) && m.confidence >= 0.75,
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

    const imagesProcessedUntil = offset + exImages.length;
    const total = totalImages ?? imagesProcessedUntil;

    return json({
      ok: true,
      images_analyzed: exImages.length,
      images_total: total,
      images_processed_until: imagesProcessedUntil,
      has_more: imagesProcessedUntil < total,
      next_offset: imagesProcessedUntil < total ? imagesProcessedUntil : null,
      batch_size: batchSize,
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
