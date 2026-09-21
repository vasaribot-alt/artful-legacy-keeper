// Edge function: protected-artwork-image
// Serves the small watermarked version of a protected work to the public.
// The full file stays in the archive and is never reachable through this route.
//
// GET /protected-artwork-image?image_id=<uuid>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const imageId = new URL(req.url).searchParams.get("image_id") || "";
  if (!UUID_RE.test(imageId)) {
    return new Response("Bad request", { status: 400, headers: corsHeaders });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: row } = await admin
      .from("artwork_images")
      .select("protected_storage_path, artwork_id, artworks!inner(protected_display)")
      .eq("id", imageId)
      .maybeSingle();

    const path = row?.protected_storage_path;
    const isProtected = (row as { artworks?: { protected_display?: boolean } } | null)?.artworks
      ?.protected_display;
    if (!path || isProtected !== true) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const { data: blob, error } = await admin.storage.from("artwork-images-protected").download(path);
    if (error || !blob) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    return new Response(blob, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("protected-artwork-image error:", err);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
