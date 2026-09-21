// Builds the small watermarked version of a work's photos in the browser and
// hands it to the protect-artwork-image function, which stores it privately.
// Rendering happens here because browsers can decode and encode JPEG reliably.

import { supabase } from "@/integrations/supabase/client";

const PROTECTED_MAX = 700; // longest side of the public watermarked version
const WEB_MAX = 2000; // longest side of the normal public derivative
const QUALITY = 0.82;

type ProgressFn = (done: number, total: number) => void;

async function loadBitmap(storagePath: string): Promise<ImageBitmap> {
  const { data, error } = await supabase.storage.from("artwork-images").download(storagePath);
  if (error || !data) throw new Error(error?.message || "Original photo missing");
  return await createImageBitmap(data);
}

function scaled(bitmap: ImageBitmap, max: number) {
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot prepare the photo in this browser");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

function watermark(ctx: CanvasRenderingContext2D, w: number, h: number, label: string) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#ffffff";
  const step = Math.max(80, Math.round(Math.min(w, h) / 4));
  ctx.lineWidth = Math.max(1, Math.round(step / 40));
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.4;
  const size = Math.max(11, Math.round(w / 26));
  ctx.font = `${size}px sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, Math.round(size / 10));
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.atan2(h, w));
  for (let i = 0; i < 3; i++) {
    const y = (i - 1) * size * 3;
    const textWidth = ctx.measureText(label).width;
    ctx.strokeText(label, -textWidth / 2, y);
    ctx.fillText(label, -textWidth / 2, y);
  }
  ctx.restore();
}

async function toBase64Jpeg(canvas: HTMLCanvasElement): Promise<string> {
  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

async function labelFor(artworkId: string): Promise<string> {
  const { data: aw } = await supabase
    .from("artworks")
    .select("owner_id, global_artwork_id")
    .eq("id", artworkId)
    .maybeSingle();
  const { data: profile } = aw?.owner_id
    ? await supabase.from("profiles").select("full_name").eq("user_id", aw.owner_id).maybeSingle()
    : { data: null as { full_name: string | null } | null };
  const gawid = aw?.global_artwork_id ? `GAWID-${aw.global_artwork_id}` : "";
  return [profile?.full_name, gawid].filter(Boolean).join("  ·  ") || "Global Artist Registry";
}

/**
 * Turn protection on or off for one work. Photos are processed one at a time so
 * large archives stay responsive. Returns the number of photos that failed.
 */
export async function setArtworkProtection(
  artworkId: string,
  makeProtected: boolean,
  onProgress?: ProgressFn,
): Promise<{ processed: number; failed: number }> {
  const { data: images, error } = await supabase
    .from("artwork_images")
    .select("id, storage_path, web_storage_path, protected_storage_path")
    .eq("artwork_id", artworkId);
  if (error) throw new Error(error.message);

  const list = images || [];
  const label = makeProtected ? await labelFor(artworkId) : "";
  let processed = 0;
  let failed = 0;
  onProgress?.(0, list.length);

  for (const img of list) {
    try {
      if (makeProtected) {
        if (!img.protected_storage_path) {
          const bitmap = await loadBitmap(img.storage_path);
          const { canvas, ctx, w, h } = scaled(bitmap, PROTECTED_MAX);
          watermark(ctx, w, h, label);
          bitmap.close?.();
          const data = await toBase64Jpeg(canvas);
          const { error: fnErr } = await supabase.functions.invoke("protect-artwork-image", {
            body: { artwork_id: artworkId, mode: "protect_image", image_id: img.id, data },
          });
          if (fnErr) throw fnErr;
        }
      } else {
        let data: string | undefined;
        if (!img.web_storage_path) {
          const bitmap = await loadBitmap(img.storage_path);
          const { canvas } = scaled(bitmap, WEB_MAX);
          bitmap.close?.();
          data = await toBase64Jpeg(canvas);
        }
        const { error: fnErr } = await supabase.functions.invoke("protect-artwork-image", {
          body: { artwork_id: artworkId, mode: "unprotect_image", image_id: img.id, data },
        });
        if (fnErr) throw fnErr;
      }
      processed++;
    } catch (err) {
      console.error("protection failed for photo", img.id, err);
      failed++;
    }
    onProgress?.(processed + failed, list.length);
  }

  if (failed === 0) {
    const { error: finErr } = await supabase.functions.invoke("protect-artwork-image", {
      body: { artwork_id: artworkId, mode: "finalize", protected: makeProtected },
    });
    if (finErr) throw finErr;
  }

  return { processed, failed };
}
