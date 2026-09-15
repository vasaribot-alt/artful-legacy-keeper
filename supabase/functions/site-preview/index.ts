import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_ORIGIN = "https://globalartistregistry.org";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const publicUrl = (bucket: string, path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, "")}`;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const fromPath = url.pathname.split("/").filter(Boolean).pop();
    const slug = (url.searchParams.get("slug") || (fromPath !== "site-preview" ? fromPath : "") || "")
      .toLowerCase();
    const target = slug ? `${SITE_ORIGIN}/site/${slug}` : SITE_ORIGIN;

    let title = "Global Artist Registry Foundation";
    let description = "Archival documentation of an artist's work.";
    let image = `${SITE_ORIGIN}/og-garf.jpg`;

    if (slug) {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data } = await supabase.rpc("get_artist_site", { _key: slug });
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        const name = row.site_title || row.full_name || "Artist";
        title = name;
        description =
          row.tagline ||
          (row.biography ? String(row.biography).slice(0, 155) : `Works and exhibitions of ${name}.`);

        let picked = "";
        const featuredId: string | null =
          row.home_featured_artwork_id || (row.home_artwork_ids || [])[0] || null;
        if (featuredId) {
          const { data: imgs } = await supabase
            .from("artwork_images")
            .select("storage_path, web_storage_path, display_order")
            .eq("artwork_id", featuredId)
            .order("display_order", { ascending: true })
            .limit(1);
          const img = imgs?.[0];
          if (img) {
            picked = img.web_storage_path
              ? publicUrl("artwork-images-web", img.web_storage_path)
              : publicUrl("artwork-images", img.storage_path);
          }
        }
        if (!picked && row.avatar_url) {
          picked = String(row.avatar_url).startsWith("http")
            ? row.avatar_url
            : publicUrl("profile-photos", row.avatar_url);
        }
        if (picked) image = picked;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(target)}" />
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="Global Artist Registry Foundation" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(target)}" />
<meta property="og:image" content="${esc(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<meta http-equiv="refresh" content="0;url=${esc(target)}" />
</head><body><p><a href="${esc(target)}">${esc(title)}</a></p>
<script>location.replace(${JSON.stringify(target)});</script>
</body></html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
    });
  } catch (e) {
    console.error("site-preview failed:", e);
    return new Response("<!DOCTYPE html><html><body>Not available</body></html>", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
