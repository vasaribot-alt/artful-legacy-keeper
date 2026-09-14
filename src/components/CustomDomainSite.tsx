import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ArtistSite from "@/pages/ArtistSite";

const RESERVED_HOSTS = new Set([
  "globalartistregistry.org",
  "www.globalartistregistry.org",
  "artful-legacy-keeper.lovable.app",
]);

const isPlatformHost = (host: string) =>
  RESERVED_HOSTS.has(host) ||
  host.endsWith(".lovable.app") ||
  host.endsWith(".lovableproject.com") ||
  host === "localhost" ||
  host === "127.0.0.1";

/**
 * When a visitor arrives on an artist's own approved custom domain,
 * render that artist's website instead of the Foundation app.
 */
export const CustomDomainSite = () => {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    if (isPlatformHost(host)) return;
    (async () => {
      const bare = host.replace(/^www\./, "");
      const { data } = await supabase.rpc("get_artist_site", { _key: bare });
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.slug) setSlug(row.slug);
    })();
  }, []);

  if (!slug) return null;
  return <ArtistSite slugOverride={slug} />;
};
