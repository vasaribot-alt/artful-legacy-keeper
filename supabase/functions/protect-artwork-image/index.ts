// Edge function: protect-artwork-image
// Stores the small watermarked version the public sees for a protected work and
// removes the large public web derivative. Reverses both on unprotect.
//
// The image itself is rendered in the browser (where canvas and JPEG encoding are
// available) and posted here as base64. This function only validates access,
// writes to the private buckets with the service role, and updates the records.
//
// Body variants:
//   { artwork_id, mode: "protect_image",   image_id, data }        base64 watermarked JPEG
//   { artwork_id, mode: "unprotect_image", image_id, data? }       base64 web JPEG (if rebuild needed)
//   { artwork_id, mode: "finalize",        protected: boolean }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MAX_BYTES = 4 * 1024 * 1024;
const UUID = /^[0-9a-f-]{36}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeBase64Jpeg(data: unknown): Uint8Array {
  if (typeof data !== "string" || data.length === 0) throw new Error("image data required");
  const raw = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  const binary = atob(raw);
  if (binary.length > MAX_BYTES) throw new Error("image too large");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8)) throw new Error("expected a JPEG");
  return bytes;
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
    const mode = String(body?.mode || "");
    if (!UUID.test(artworkId)) return json({ error: "artwork_id required" }, 400);
    if (!["protect_image", "unprotect_image", "finalize"].includes(mode)) {
      return json({ error: "unknown mode" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: artwork, error: awErr } = await admin
      .from("artworks")
      .select("id, owner_id")
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

    if (mode === "finalize") {
      const flag = body?.protected === true;
      await admin.from("artworks").update({ protected_display: flag }).eq("id", artworkId);
      return json({ ok: true, protected_display: flag });
    }

    const imageId = typeof body?.image_id === "string" ? body.image_id : "";
    if (!UUID.test(imageId)) return json({ error: "image_id required" }, 400);

    const { data: image, error: imgErr } = await admin
      .from("artwork_images")
      .select("id, artwork_id, web_storage_path, protected_storage_path")
      .eq("id", imageId)
      .maybeSingle();
    if (imgErr) throw new Error(imgErr.message);
    if (!image || image.artwork_id !== artworkId) return json({ error: "Photo not found" }, 404);

    if (mode === "protect_image") {
      const bytes = decodeBase64Jpeg(body?.data);
      const path = `${artwork.owner_id}/${image.id}.jpg`;
      const { error: upErr } = await admin.storage
        .from("artwork-images-protected")
        .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw new Error(upErr.message);

      // the large public derivative must not stay available
      if (image.web_storage_path) {
        await admin.storage.from("artwork-images-web").remove([image.web_storage_path]);
      }
      await admin
        .from("artwork_images")
        .update({ protected_storage_path: path, web_storage_path: null })
        .eq("id", image.id);
      return json({ ok: true, image_id: image.id, protected_storage_path: path });
    }

    // unprotect_image
    if (image.protected_storage_path) {
      await admin.storage.from("artwork-images-protected").remove([image.protected_storage_path]);
    }
    let webPath = image.web_storage_path as string | null;
    if (!webPath && body?.data) {
      const bytes = decodeBase64Jpeg(body.data);
      webPath = `${artwork.owner_id}/${image.id}.jpg`;
      const { error: upErr } = await admin.storage
        .from("artwork-images-web")
        .upload(webPath, bytes, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw new Error(upErr.message);
    }
    await admin
      .from("artwork_images")
      .update({ protected_storage_path: null, web_storage_path: webPath })
      .eq("id", image.id);
    return json({ ok: true, image_id: image.id, web_storage_path: webPath });
  } catch (err) {
    console.error("protect-artwork-image error:", err);
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
