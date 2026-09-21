// Edge function: protect-artwork-image
// Builds the small watermarked version the public sees for a protected work,
// and removes the large public web derivative. Reverses both on unprotect.
//
// Body: { artwork_id: string, mode?: "protect" | "unprotect" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const PROTECTED_MAX = 700; // longest side of the public version
const WEB_MAX = 2000; // longest side of the normal public derivative
const QUALITY = 0.82;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Scale a bitmap into a canvas no larger than max on its longest side. */
function fit(bitmap: ImageBitmap, max: number) {
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

/** Repeating diagonal mark carrying the artist name and GAWID. */
function watermark(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number, label: string) {
  const step = Math.max(90, Math.round(Math.min(w, h) / 4));
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, Math.round(step / 40));
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.stroke();
  }
  ctx.restore();

  try {
    ctx.save();
    ctx.globalAlpha = 0.34;
    const size = Math.max(11, Math.round(w / 26));
    ctx.font = `${size}px sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = Math.max(1, Math.round(size / 10));
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.atan2(h, w));
    const rows = 3;
    for (let i = 0; i < rows; i++) {
      const y = (i - (rows - 1) / 2) * size * 3;
      const metrics = ctx.measureText(label);
      const textWidth = metrics?.width || label.length * size * 0.55;
      ctx.strokeText(label, -textWidth / 2, y);
      ctx.fillText(label, -textWidth / 2, y);
    }
    ctx.restore();
  } catch (err) {
    // Text drawing is unavailable in this runtime — the diagonal mark still applies.
    console.warn("watermark text unavailable", String(err));
  }
}

async function encode(canvas: OffscreenCanvas): Promise<Uint8Array> {
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
  return new Uint8Array(await blob.arrayBuffer());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const artworkId = typeof body?.artwork_id === "string" ? body.artwork_id : "";
    const mode = body?.mode === "unprotect" ? "unprotect" : "protect";
    if (!/^[0-9a-f-]{36}$/i.test(artworkId)) return json({ error: "artwork_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: artwork, error: awErr } = await admin
      .from("artworks")
      .select("id, owner_id, title, global_artwork_id, protected_display")
      .eq("id", artworkId)
      .maybeSingle();
    if (awErr) throw new Error(awErr.message);
    if (!artwork) return json({ error: "Work not found" }, 404);

    // owner, granted registrar, or foundation staff
    if (artwork.owner_id !== userId) {
      const [{ data: registrarOk }, { data: foundationOk }] = await Promise.all([
        admin.rpc("has_registrar_access", { _registrar_id: userId, _owner_id: artwork.owner_id }),
        admin.rpc("has_role", { _user_id: userId, _role: "foundation" }),
      ]);
      if (registrarOk !== true && foundationOk !== true) return json({ error: "Forbidden" }, 403);
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, global_artist_id")
      .eq("user_id", artwork.owner_id)
      .maybeSingle();

    const gawid = artwork.global_artwork_id ? `GAWID-${artwork.global_artwork_id}` : "";
    const label = [profile?.full_name, gawid].filter(Boolean).join("  ·  ") || "Global Artist Registry";

    const { data: images, error: imgErr } = await admin
      .from("artwork_images")
      .select("id, storage_path, web_storage_path, protected_storage_path")
      .eq("artwork_id", artworkId);
    if (imgErr) throw new Error(imgErr.message);

    let done = 0;
    const failures: string[] = [];

    for (const img of images || []) {
      try {
        if (mode === "unprotect") {
          // restore the normal public derivative, drop the watermarked one
          if (img.protected_storage_path) {
            await admin.storage.from("artwork-images-protected").remove([img.protected_storage_path]);
          }
          if (!img.web_storage_path) {
            const { data: blob, error: dlErr } = await admin.storage
              .from("artwork-images")
              .download(img.storage_path);
            if (dlErr || !blob) throw new Error(dlErr?.message || "original missing");
            const bitmap = await createImageBitmap(blob);
            const { canvas } = fit(bitmap, WEB_MAX);
            const bytes = await encode(canvas);
            const webPath = `${artwork.owner_id}/${img.id}.jpg`;
            const { error: upErr } = await admin.storage
              .from("artwork-images-web")
              .upload(webPath, bytes, { contentType: "image/jpeg", upsert: true });
            if (upErr) throw new Error(upErr.message);
            await admin
              .from("artwork_images")
              .update({ web_storage_path: webPath, protected_storage_path: null })
              .eq("id", img.id);
          } else {
            await admin.from("artwork_images").update({ protected_storage_path: null }).eq("id", img.id);
          }
          done++;
          continue;
        }

        // protect: build the small watermarked version from the original
        const { data: blob, error: dlErr } = await admin.storage
          .from("artwork-images")
          .download(img.storage_path);
        if (dlErr || !blob) throw new Error(dlErr?.message || "original missing");
        const bitmap = await createImageBitmap(blob);
        const { canvas, ctx, w, h } = fit(bitmap, PROTECTED_MAX);
        watermark(ctx, w, h, label);
        const bytes = await encode(canvas);
        const path = `${artwork.owner_id}/${img.id}.jpg`;
        const { error: upErr } = await admin.storage
          .from("artwork-images-protected")
          .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw new Error(upErr.message);

        // the large public derivative must not stay available
        if (img.web_storage_path) {
          await admin.storage.from("artwork-images-web").remove([img.web_storage_path]);
        }
        await admin
          .from("artwork_images")
          .update({ protected_storage_path: path, web_storage_path: null })
          .eq("id", img.id);
        done++;
      } catch (err) {
        console.error("protect image failed", img.id, err);
        failures.push(img.id);
      }
    }

    await admin
      .from("artworks")
      .update({ protected_display: mode === "protect" })
      .eq("id", artworkId);

    return json({ ok: true, mode, images: done, failed: failures.length });
  } catch (err) {
    console.error("protect-artwork-image error:", err);
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
