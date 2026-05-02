import { supabase } from "@/integrations/supabase/client";
import { assertWithinQuota } from "./storageQuota";

export interface OptimizedUploadResult {
  storage_path: string;
  web_storage_path: string | null;
  file_size: number;
  original_size: number;
  width: number | null;
  height: number | null;
  mime_type: string;
}

const MAX_CLIENT_DIMENSION = 2000;
const CLIENT_QUALITY = 0.85;

/**
 * Generate a web-optimized derivative client-side using Canvas.
 * Returns null if the browser cannot decode the image (e.g. TIFF, RAW).
 */
async function generateWebDerivative(file: File): Promise<{ blob: Blob; width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, MAX_CLIENT_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * ratio);
    const h = Math.round(bitmap.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", CLIENT_QUALITY),
    );
    if (!blob) return null;
    return { blob, width: w, height: h };
  } catch {
    return null;
  }
}

/**
 * Uploads original to `originalBucket` and a web-optimized JPEG to `webBucket`.
 * - Originals are preserved untouched (archival).
 * - Web derivative is what the app displays everywhere.
 * - For browser-undecodable formats (TIFF, RAW, HEIC), web derivative is skipped — app falls back to original.
 */
export async function uploadOptimizedImage(opts: {
  file: File;
  userId: string;
  originalBucket: string;
  webBucket: string;
  pathPrefix: string; // e.g. `${userId}/${artworkId}`
}): Promise<OptimizedUploadResult> {
  const { file, userId, originalBucket, webBucket, pathPrefix } = opts;
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const baseName = `${crypto.randomUUID()}`;
  const originalPath = `${pathPrefix}/${baseName}.${ext}`;

  // 0. Quota check (fail-fast before upload)
  await assertWithinQuota(userId, file.size);

  // 1. Upload original
  const { error: origErr } = await supabase.storage
    .from(originalBucket)
    .upload(originalPath, file, { contentType: file.type, upsert: false });
  if (origErr) throw origErr;

  let web_storage_path: string | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let webSize = file.size;

  const webPath = `${userId}/${baseName}.jpg`;
  const isTiff = ext === "tif" || ext === "tiff" || file.type === "image/tiff";

  // 2a. TIFF / unsupported → server-side optimization via edge function
  if (isTiff) {
    try {
      const { data, error } = await supabase.functions.invoke("optimize-image", {
        body: {
          originalBucket,
          originalPath,
          webBucket,
          webPath,
          mimeType: file.type,
        },
      });
      if (!error && data?.web_storage_path) {
        web_storage_path = data.web_storage_path;
        width = data.width ?? null;
        height = data.height ?? null;
        webSize = data.size ?? file.size;
      }
    } catch (e) {
      console.warn("Server-side optimization failed, falling back to original:", e);
    }
  } else {
    // 2b. Standard browser-decodable formats → client-side derivative
    const derivative = await generateWebDerivative(file);
    if (derivative) {
      const { error: webErr } = await supabase.storage
        .from(webBucket)
        .upload(webPath, derivative.blob, { contentType: "image/jpeg", upsert: false });
      if (!webErr) {
        web_storage_path = webPath;
        width = derivative.width;
        height = derivative.height;
        webSize = derivative.blob.size;
      }
    }
  }

  return {
    storage_path: originalPath,
    web_storage_path,
    file_size: webSize,
    original_size: file.size,
    width,
    height,
    mime_type: file.type || `image/${ext}`,
  };
}

/** Resolve the best display URL for an image row: prefer web derivative, fall back to original. */
export function resolveImageUrl(
  row: { storage_path: string; web_storage_path?: string | null },
  originalBucket: string,
  webBucket: string,
): string {
  if (row.web_storage_path) {
    return supabase.storage.from(webBucket).getPublicUrl(row.web_storage_path).data.publicUrl;
  }
  return supabase.storage.from(originalBucket).getPublicUrl(row.storage_path).data.publicUrl;
}
