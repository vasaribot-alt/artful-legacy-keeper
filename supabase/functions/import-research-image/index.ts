import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 25 * 1024 * 1024;

const extFor = (mime: string, url: string) => {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("tif")) return "tif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  const m = url.split("?")[0].match(/\.(jpe?g|png|webp|gif|tiff?)$/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const caller = userData.user.id;

    const body = await req.json().catch(() => null);
    const imageUrl = typeof body?.image_url === "string" ? body.image_url : "";
    const artworkId = typeof body?.artwork_id === "string" ? body.artwork_id : "";
    const ownerId = typeof body?.owner_id === "string" ? body.owner_id : "";
    const unlinked = body?.unlinked === true;
    const roleContext = typeof body?.role_context === "string" ? body.role_context : "artist";

    if (!/^https?:\/\//i.test(imageUrl)) return json({ error: "Invalid image URL" }, 400);
    if (!unlinked && !artworkId) return json({ error: "artwork_id is required" }, 400);
    if (!ownerId) return json({ error: "owner_id is required" }, 400);

    const admin = createClient(url, service);

    // Authorisation: caller is the owner, or an approved registrar for the owner
    if (caller !== ownerId) {
      const { data: allowed } = await admin.rpc("has_registrar_access", {
        _registrar_id: caller,
        _owner_id: ownerId,
      });
      if (allowed !== true) return json({ error: "Forbidden" }, 403);
    }

    if (artworkId) {
      const { data: art } = await admin
        .from("artworks")
        .select("id, owner_id")
        .eq("id", artworkId)
        .maybeSingle();
      if (!art || art.owner_id !== ownerId) return json({ error: "Artwork not found" }, 404);
    }

    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GARF-Research/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) return json({ error: `Source returned ${res.status}` }, 422);

    const mime = (res.headers.get("content-type") || "").toLowerCase();
    if (!mime.startsWith("image/")) return json({ error: "The link is not an image" }, 422);

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0) return json({ error: "Empty image" }, 422);
    if (bytes.byteLength > MAX_BYTES) return json({ error: "Image is too large" }, 413);

    const ext = extFor(mime, imageUrl);
    const prefix = artworkId ? `${ownerId}/${artworkId}` : `${ownerId}/_unlinked`;
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("artwork-images")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (upErr) return json({ error: upErr.message }, 500);

    if (artworkId) {
      const { count } = await admin
        .from("artwork_images")
        .select("id", { count: "exact", head: true })
        .eq("artwork_id", artworkId);
      const { error: dbErr } = await admin.from("artwork_images").insert({
        artwork_id: artworkId,
        storage_path: path,
        file_size: bytes.byteLength,
        original_size: bytes.byteLength,
        mime_type: mime,
        display_order: count ?? 0,
      });
      if (dbErr) return json({ error: dbErr.message }, 500);
    } else {
      const { error: dbErr } = await admin.from("user_uploads").insert({
        user_id: ownerId,
        role_context: roleContext,
        storage_path: path,
        file_name: imageUrl.split("/").pop()?.split("?")[0] || `research.${ext}`,
        file_size: bytes.byteLength,
        original_size: bytes.byteLength,
        mime_type: mime,
      });
      if (dbErr) return json({ error: dbErr.message }, 500);
    }

    return json({ ok: true, storage_path: path, size: bytes.byteLength });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
