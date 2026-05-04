// Detect which catalogued artworks appear in an exhibition's installation views.
//
// Strategy (description-first):
//   1. For each installation view, ensure we have an AI-generated visual
//      description cached on `exhibition_images.ai_description`.
//   2. For each catalogue artwork, ensure we have an AI description cached on
//      `artworks.ai_description`.
//   3. Use a text-only AI call to shortlist plausible artwork candidates per
//      installation view (no image payload).
//   4. Visually verify the shortlist (1 installation view + 1 candidate thumb
//      per call) — small payloads, no 413 errors.
//
// Descriptions are cached forever so re-running detection is nearly free.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const DEFAULT_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 1;
const SHORTLIST_SIZE = 6;            // candidates from text matching
const MIN_VERIFICATION_CONFIDENCE = 0.72;
const INSTALLATION_TRANSFORM = { width: 900, quality: 60 };
const THUMB_TRANSFORM = { width: 512, quality: 60 };

interface CatalogueArtwork {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
  thumb: string | null;
  description: string | null;
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
  transform?: { width?: number; height?: number; quality?: number },
) {
  return admin.storage.from(bucket).getPublicUrl(path, transform ? { transform } : undefined).data.publicUrl;
}

function getAiSafeImageUrl(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
) {
  return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function aiFetch(body: unknown): Promise<any> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error("AI error", resp.status, txt.slice(0, 300));
    throw new AiRequestError(resp.status, txt);
  }
  return await resp.json();
}

// Generate a structured visual description of a single image.
async function describeImage(imageUrl: string, kind: "artwork" | "installation"): Promise<string> {
  const instruction =
    kind === "artwork"
      ? "Describe this single artwork for archival matching. Cover: dominant colours, palette mood, geometry/composition, motifs, any visible text/numbers/lettering, medium cues (paint texture, photo, sculpture), and orientation. 60-120 words. No interpretation, just visual facts."
      : "Describe every artwork visible in this installation photograph. For each work, give: position in the scene (left/centre/right, foreground/back wall), dominant colours, geometry/motif, any visible text or numbers, and medium cues. Then list the room features (wall colour, floor, lighting). 100-200 words.";

  const data = await aiFetch({
    model: MODEL,
    messages: [
      { role: "system", content: "You are a precise visual describer for an art archive. Be concrete, neutral, and concise." },
      {
        role: "user",
        content: [
          { type: "text", text: instruction },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("Empty description from AI");
  return text.trim();
}

// Given an installation description and the catalogue list (with descriptions),
// return ranked artwork ids that plausibly appear in the photo.
async function shortlistCandidates(
  installationDescription: string,
  catalogue: Array<CatalogueArtwork & { description: string }>,
): Promise<Array<{ artwork_id: string; score: number; reasoning?: string }>> {
  // Build a compact catalogue text block. No images.
  const catalogueText = catalogue
    .map(
      (a, i) =>
        `[${i + 1}] id=${a.id} | "${a.title}"${a.year ? ` (${a.year})` : ""}${a.medium ? ` — ${a.medium}` : ""}\nDESC: ${a.description}`,
    )
    .join("\n\n");

  const data = await aiFetch({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You shortlist artwork candidates from a catalogue that may appear in an installation photograph. Use only the textual descriptions. Be inclusive at this stage — include any work whose description plausibly matches something visible. Reject only clearly unrelated works.",
      },
      {
        role: "user",
        content:
          `INSTALLATION DESCRIPTION:\n${installationDescription}\n\n` +
          `CATALOGUE (${catalogue.length} works):\n${catalogueText}\n\n` +
          `Return up to ${SHORTLIST_SIZE} candidate ids ranked by how well their description matches works visible in the installation. Use the exact id strings shown above.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "shortlist",
          description: "Return ranked candidate artwork ids.",
          parameters: {
            type: "object",
            properties: {
              candidates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    artwork_id: { type: "string" },
                    score: { type: "number", description: "0..1 plausibility" },
                    reasoning: { type: "string" },
                  },
                  required: ["artwork_id", "score"],
                },
              },
            },
            required: ["candidates"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "shortlist" } },
  });
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return [];
  try {
    const parsed = JSON.parse(args) as { candidates?: Array<{ artwork_id: string; score: number; reasoning?: string }> };
    const valid = new Set(catalogue.map((a) => a.id));
    return (parsed.candidates ?? [])
      .filter((c) => valid.has(c.artwork_id))
      .slice(0, SHORTLIST_SIZE);
  } catch {
    return [];
  }
}

// Visually verify a single (installation, artwork) pair. Tiny payload.
async function verifyPair(
  installationUrl: string,
  artwork: CatalogueArtwork,
): Promise<{ confidence: number; reasoning?: string } | null> {
  if (!artwork.thumb) return null;
  const data = await aiFetch({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a strict art-historical verifier. Decide whether the catalogue artwork (image 2) is actually visible in the installation photograph (image 1). Reject same-series lookalikes. Be conservative.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Catalogue artwork: "${artwork.title}"${artwork.year ? ` (${artwork.year})` : ""}${artwork.medium ? ` — ${artwork.medium}` : ""}.\n` +
              `Image 1 = installation view. Image 2 = catalogue artwork.\n` +
              `Return confidence 0..1 that THIS exact work is visible in the installation. Cite specific evidence (colours, motifs, text, composition). Confidence < ${MIN_VERIFICATION_CONFIDENCE} means no match.`,
          },
          { type: "image_url", image_url: { url: installationUrl } },
          { type: "image_url", image_url: { url: artwork.thumb } },
        ],
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "verify",
          parameters: {
            type: "object",
            properties: {
              confidence: { type: "number" },
              reasoning: { type: "string" },
            },
            required: ["confidence"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "verify" } },
  });
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  try {
    const parsed = JSON.parse(args) as { confidence: number; reasoning?: string };
    if (typeof parsed.confidence !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function fallbackResponse(code: string, message: string, ctx: any) {
  return json({ ok: false, fallback: true, code, error: message, ...ctx });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

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

    // Verify access
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

    // Load this batch of installation views
    const { data: exImages, count: totalImages, error: exImagesError } = await admin
      .from("exhibition_images")
      .select("id, storage_path, web_storage_path, ai_description", { count: "exact" })
      .eq("exhibition_id", exhibition_id)
      .order("display_order")
      .range(offset, offset + batchSize - 1);
    if (exImagesError) throw exImagesError;

    if ((totalImages ?? 0) === 0) return json({ error: "No installation views to analyze" }, 400);
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

    // Load full artwork catalogue (with cached descriptions)
    const { data: artworks } = await admin
      .from("artworks")
      .select("id, title, year, medium, image_url, ai_description")
      .eq("owner_id", ownerId);
    if (!artworks || artworks.length === 0) {
      return json({ error: "Artist has no catalogued artworks to compare against" }, 400);
    }

    // Build thumb map
    const ids = artworks.map((a) => a.id);
    const thumbInfo = new Map<string, { bucket: string; path: string }>();
    const CHUNK = 100;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { data: artImages } = await admin
        .from("artwork_images")
        .select("artwork_id, storage_path, web_storage_path, display_order")
        .in("artwork_id", slice)
        .order("display_order", { nullsFirst: false });
      for (const im of artImages ?? []) {
        if (thumbInfo.has(im.artwork_id)) continue;
        const path = im.web_storage_path || im.storage_path;
        if (!path) continue;
        const bucket = im.web_storage_path ? "artwork-images-web" : "artwork-images";
        thumbInfo.set(im.artwork_id, { bucket, path });
      }
    }

    const catalogue: CatalogueArtwork[] = artworks.map((a) => {
      const info = thumbInfo.get(a.id);
      let thumb: string | null = null;
      if (info) {
        thumb = getPublicImageUrl(admin, info.bucket, info.path);
      } else if (a.image_url) {
        thumb = a.image_url.startsWith("http")
          ? a.image_url
          : getPublicImageUrl(admin, "artwork-images", a.image_url);
      }
      return {
        id: a.id,
        title: a.title,
        year: a.year,
        medium: a.medium,
        thumb,
        description: a.ai_description ?? null,
      };
    });

    // Generate descriptions for any artworks missing them (cached forever).
    // Cap how many we describe per invocation to keep latency reasonable.
    const MAX_DESCRIBE_PER_RUN = 30;
    const needArtworkDesc = catalogue.filter((a) => !a.description && a.thumb).slice(0, MAX_DESCRIBE_PER_RUN);
    let describedArtworks = 0;
    for (const a of needArtworkDesc) {
      try {
        // Use a small transformed thumb to keep payload tiny
        const info = thumbInfo.get(a.id);
        const url = info ? getAiSafeImageUrl(admin, info.bucket, info.path) : a.thumb!;
        const desc = await describeImage(url, "artwork");
        a.description = desc;
        await admin.from("artworks").update({ ai_description: desc, ai_described_at: new Date().toISOString() }).eq("id", a.id);
        describedArtworks++;
      } catch (e) {
        if (e instanceof AiRequestError && e.status === 429) {
          return fallbackResponse("AI_RATE_LIMIT", "Rate limit reached while describing artworks. Please run again shortly.", {
            images_total: totalImages ?? exImages.length,
            images_processed_until: offset,
            has_more: true,
            next_offset: offset,
            described_artworks: describedArtworks,
          });
        }
        if (e instanceof AiRequestError && e.status === 402) {
          return fallbackResponse("AI_CREDITS_EXHAUSTED", "AI credits exhausted. Add credits in workspace settings.", {
            images_total: totalImages ?? exImages.length,
            images_processed_until: offset,
            has_more: true,
            next_offset: offset,
          });
        }
        console.warn("describe artwork failed", a.id, e instanceof Error ? e.message : e);
      }
    }

    const catalogueWithDesc = catalogue.filter((a) => a.description && a.thumb) as Array<CatalogueArtwork & { description: string }>;
    if (catalogueWithDesc.length === 0) {
      return json({ error: "No artwork descriptions available yet — please run again to continue indexing." }, 400);
    }

    let totalInserted = 0;
    const allMatches: Array<{ exhibition_image_id: string; matches: any[] }> = [];

    for (const exImg of exImages) {
      const exPath = exImg.web_storage_path || exImg.storage_path;
      const exBucket = exImg.web_storage_path ? "exhibition-images-web" : "exhibition-images";
      const installationUrl = getAiSafeImageUrl(admin, exBucket, exPath);

      // 1. Ensure installation description
      let installationDesc = exImg.ai_description as string | null;
      if (!installationDesc) {
        try {
          installationDesc = await describeImage(installationUrl, "installation");
          await admin
            .from("exhibition_images")
            .update({ ai_description: installationDesc, ai_described_at: new Date().toISOString() })
            .eq("id", exImg.id);
        } catch (e) {
          if (e instanceof AiRequestError && e.status === 429) {
            return fallbackResponse("AI_RATE_LIMIT", "Rate limit reached. Please run again shortly.", {
              images_analyzed: allMatches.length,
              images_total: totalImages ?? exImages.length,
              images_processed_until: offset + allMatches.length,
              has_more: true,
              next_offset: offset + allMatches.length,
              suggestions_created: totalInserted,
              results: allMatches,
            });
          }
          if (e instanceof AiRequestError && e.status === 402) {
            return fallbackResponse("AI_CREDITS_EXHAUSTED", "AI credits exhausted.", {
              images_analyzed: allMatches.length,
              images_total: totalImages ?? exImages.length,
              images_processed_until: offset + allMatches.length,
              has_more: true,
              next_offset: offset + allMatches.length,
              suggestions_created: totalInserted,
              results: allMatches,
            });
          }
          throw e;
        }
      }

      // 2. Text shortlist
      let shortlist: Array<{ artwork_id: string; score: number; reasoning?: string }> = [];
      try {
        shortlist = await shortlistCandidates(installationDesc, catalogueWithDesc);
      } catch (e) {
        if (e instanceof AiRequestError && (e.status === 429 || e.status === 402)) {
          const code = e.status === 429 ? "AI_RATE_LIMIT" : "AI_CREDITS_EXHAUSTED";
          return fallbackResponse(code, e.status === 429 ? "Rate limit reached." : "AI credits exhausted.", {
            images_analyzed: allMatches.length,
            images_total: totalImages ?? exImages.length,
            images_processed_until: offset + allMatches.length,
            has_more: true,
            next_offset: offset + allMatches.length,
            suggestions_created: totalInserted,
            results: allMatches,
          });
        }
        throw e;
      }

      // 3. Visual verify each shortlisted candidate (one at a time — tiny payload)
      const { data: existingSuggestions } = await admin
        .from("artwork_match_suggestions")
        .select("artwork_id")
        .eq("exhibition_image_id", exImg.id);

      const existingArtworkIds = new Set((existingSuggestions ?? []).map((row) => row.artwork_id));
      const verified: Array<{ artwork_id: string; confidence: number; reasoning?: string }> = [];
      for (const cand of shortlist) {
        if (existingArtworkIds.has(cand.artwork_id)) continue;
        const artwork = catalogueWithDesc.find((a) => a.id === cand.artwork_id);
        if (!artwork) continue;
        const info = thumbInfo.get(artwork.id);
        const verifyArtwork: CatalogueArtwork = {
          ...artwork,
          thumb: info ? getAiSafeImageUrl(admin, info.bucket, info.path) : artwork.thumb,
        };
        try {
          const result = await verifyPair(installationUrl, verifyArtwork);
          if (result && result.confidence >= MIN_VERIFICATION_CONFIDENCE) {
            verified.push({ artwork_id: artwork.id, confidence: result.confidence, reasoning: result.reasoning ?? cand.reasoning });
          }
        } catch (e) {
          if (e instanceof AiRequestError && (e.status === 429 || e.status === 402)) {
            const code = e.status === 429 ? "AI_RATE_LIMIT" : "AI_CREDITS_EXHAUSTED";
            return fallbackResponse(code, e.status === 429 ? "Rate limit reached." : "AI credits exhausted.", {
              images_analyzed: allMatches.length,
              images_total: totalImages ?? exImages.length,
              images_processed_until: offset + allMatches.length,
              has_more: true,
              next_offset: offset + allMatches.length,
              suggestions_created: totalInserted,
              results: allMatches,
            });
          }
          console.warn("verify failed", artwork.id, e instanceof Error ? e.message : e);
        }
      }

      allMatches.push({ exhibition_image_id: exImg.id, matches: verified });

      for (const m of verified) {
        const { error: insErr } = await admin.from("artwork_match_suggestions").insert({
          exhibition_id,
          exhibition_image_id: exImg.id,
          artwork_id: m.artwork_id,
          owner_id: ownerId,
          confidence: m.confidence,
          reasoning: m.reasoning ?? null,
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
      indexed_catalogue_artworks: catalogueWithDesc.length,
      total_catalogue_artworks: artworks.length,
      catalogue_size: catalogueWithDesc.length,
      described_artworks_this_run: describedArtworks,
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
