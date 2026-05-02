// Edge function: optimize-image
// Server-side image optimization for heavy/uncommon formats (TIFF, HEIC, RAW, large JPEG/PNG).
// Workflow:
//   1. Client uploads ORIGINAL to a private/archival bucket and passes { originalBucket, originalPath, webBucket, webPath }.
//   2. This function downloads the original via service role, decodes it, generates a max-2000px JPEG @ 85%,
//      and uploads it to the public web bucket at webPath.
//   3. Returns { width, height, size, mimeType } so the client can persist metadata.
//
// JWT verification is enabled by default — the caller must be authenticated.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
// decode TIFF / other formats via UTIF (pure JS, no native deps)
import UTIF from "https://esm.sh/utif@3.1.0";

const MAX_DIMENSION = 2000;
const QUALITY = 0.85;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  originalBucket: string;
  originalPath: string;
  webBucket: string;
  webPath: string;
  mimeType?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json()) as RequestBody;
    if (!body.originalBucket || !body.originalPath || !body.webBucket || !body.webPath) {
      return json({ error: "originalBucket, originalPath, webBucket, webPath required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Download original
    const { data: blob, error: dlErr } = await admin.storage
      .from(body.originalBucket)
      .download(body.originalPath);
    if (dlErr || !blob) throw new Error(`download failed: ${dlErr?.message}`);

    const ext = body.originalPath.split(".").pop()?.toLowerCase() || "";
    const isTiff = ext === "tif" || ext === "tiff" || body.mimeType === "image/tiff";

    let outBytes: Uint8Array;
    let outWidth: number;
    let outHeight: number;

    if (isTiff) {
      // Decode TIFF with UTIF, then re-encode as JPEG via OffscreenCanvas
      const buf = new Uint8Array(await blob.arrayBuffer());
      const ifds = UTIF.decode(buf);
      if (!ifds.length) throw new Error("TIFF has no pages");
      UTIF.decodeImage(buf, ifds[0]);
      const rgba = UTIF.toRGBA8(ifds[0]); // Uint8Array RGBA
      const w = ifds[0].width;
      const h = ifds[0].height;
      const ratio = Math.min(1, MAX_DIMENSION / Math.max(w, h));
      const targetW = Math.max(1, Math.round(w * ratio));
      const targetH = Math.max(1, Math.round(h * ratio));

      // Build an ImageData → ImageBitmap via OffscreenCanvas
      const srcCanvas = new OffscreenCanvas(w, h);
      const srcCtx = srcCanvas.getContext("2d");
      if (!srcCtx) throw new Error("Canvas 2D unavailable");
      const imgData = new ImageData(new Uint8ClampedArray(rgba.buffer), w, h);
      srcCtx.putImageData(imgData, 0, 0);

      const dstCanvas = new OffscreenCanvas(targetW, targetH);
      const dstCtx = dstCanvas.getContext("2d");
      if (!dstCtx) throw new Error("Canvas 2D unavailable");
      dstCtx.drawImage(srcCanvas, 0, 0, targetW, targetH);
      const out = await dstCanvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
      outBytes = new Uint8Array(await out.arrayBuffer());
      outWidth = targetW;
      outHeight = targetH;
    } else {
      // JPEG / PNG / WebP path — direct decode
      const bitmap = await createImageBitmap(blob);
      const ratio = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
      const targetW = Math.max(1, Math.round(bitmap.width * ratio));
      const targetH = Math.max(1, Math.round(bitmap.height * ratio));
      const canvas = new OffscreenCanvas(targetW, targetH);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D unavailable");
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      const out = await canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
      outBytes = new Uint8Array(await out.arrayBuffer());
      outWidth = targetW;
      outHeight = targetH;
    }

    // 2. Upload web derivative
    const { error: upErr } = await admin.storage
      .from(body.webBucket)
      .upload(body.webPath, outBytes, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw new Error(`web upload failed: ${upErr.message}`);

    return json({
      web_storage_path: body.webPath,
      width: outWidth,
      height: outHeight,
      size: outBytes.length,
      mimeType: "image/jpeg",
    });
  } catch (err) {
    console.error("optimize-image error:", err);
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
