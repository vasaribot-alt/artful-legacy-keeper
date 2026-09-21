// Edge function: protect-artwork-image
// Builds the small watermarked version the public sees for a protected work,
// and removes the large public web derivative. Reverses both on unprotect.
//
// Body: { artwork_id: string, mode?: "protect" | "unprotect" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";


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

/** Font used for the watermark label, fetched once per instance. */
let fontCache: Uint8Array | null = null;
async function label_font(): Promise<Uint8Array | null> {
  if (fontCache) return fontCache;
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/static/Roboto-Medium.ttf",
    );
    if (!res.ok) throw new Error(`font ${res.status}`);
    fontCache = new Uint8Array(await res.arrayBuffer());
    return fontCache;
  } catch (err) {
    console.warn("watermark font unavailable", String(err));
    return null;
  }
}

/** Decode, scale and (optionally) watermark an image, returning JPEG bytes. */
async function render(
  input: Uint8Array,
  max: number,
  label: string | null,
): Promise<Uint8Array> {
  const decoded = await Image.decode(input);
  const image = decoded instanceof Image ? decoded : (decoded as unknown as Image);
  const ratio = Math.min(1, max / Math.max(image.width, image.height));
  if (ratio < 1) {
    image.resize(Math.max(1, Math.round(image.width * ratio)), Image.RESIZE_AUTO);
  }

  if (label) {
    const font = await label_font();
    if (font) {
      try {
        const size = Math.max(12, Math.round(image.width / 24));
        const text = await Image.renderText(font, size, label, 0xffffffbb);
        text.rotate(-24);
        const rows = 3;
        for (let i = 0; i < rows; i++) {
          const x = Math.round((image.width - text.width) / 2);
          const y = Math.round(image.height / 2 - text.height / 2 + (i - 1) * text.height * 2.2);
          image.composite(text, x, y);
        }
      } catch (err) {
        console.warn("watermark text failed", String(err));
      }
    }
  }

  return await image.encodeJPEG(Math.round(QUALITY * 100));
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
            const bytes = await render(new Uint8Array(await blob.arrayBuffer()), WEB_MAX, null);

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
        const bytes = await render(new Uint8Array(await blob.arrayBuffer()), PROTECTED_MAX, label);

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
        const reason = String(err instanceof Error ? err.message : err);
        console.error("protect image failed", img.id, reason);
        failures.push(`${img.id}: ${reason}`);
      }
    }

    await admin
      .from("artworks")
      .update({ protected_display: mode === "protect" })
      .eq("id", artworkId);

    return json({ ok: true, mode, images: done, failed: failures.length, failures });

  } catch (err) {
    console.error("protect-artwork-image error:", err);
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
