import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { SocialPlatformIcon } from "@/components/SocialLinks";
import { ArrowRight, Clock, Globe, Mail, MapPin, PhoneCall, X } from "lucide-react";

interface SiteData {
  user_id: string;
  slug: string;
  site_title: string | null;
  tagline: string | null;
  about_text: string | null;
  contact_options: { email?: boolean; phone?: boolean; gallery?: boolean } | null;
  artwork_ids: string[] | null;
  legacy_mode: boolean;
  full_name: string | null;
  avatar_url: string | null;
  birth_year: number | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone_prefix: string | null;
  phone: string | null;
  website: string | null;
  biography: string | null;
  social_media_links: { platform: string; url: string }[] | null;
  galleries: {
    name: string;
    phone: string;
    website: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    hours?: string;
    description?: string;
    photo_url?: string;
  }[] | null;
  contact_visibility: Record<string, boolean> | null;
  global_artist_id: number;
  home_layout: "portrait" | "featured" | "grid";
  home_featured_artwork_id: string | null;
  home_artwork_ids: string[] | null;
  sections: Record<string, boolean> | null;
}

interface CvEntry { id: string; section: string; entry_text: string; year: string | null; display_order: number | null }
interface SiteExhibition {
  id: string; title: string; exhibition_type: string; opening_date: string | null; closing_date: string | null;
  venue: string | null; city: string | null; country: string | null; curator: string | null; description: string | null;
}
interface SiteCatalogue {
  id: string; title: string; publication_year: number | null; publisher: string | null; authors: string | null;
  isbn: string | null; cover_image_path: string | null;
}
interface SiteNews { id: string; title: string; body: string | null; news_date: string }

interface Artwork {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  image_url: string | null;
  images: { storage_path: string; web_storage_path?: string | null; display_order: number }[];
}

type Page = "home" | "works" | "about" | "contact" | "cv" | "exhibitions" | "publications" | "news";

const SUB_PAGES = ["works", "about", "contact", "cv", "exhibitions", "publications", "news"];

const ArtistSite = ({ slugOverride }: { slugOverride?: string }) => {
  const params = useParams<{ slug: string; page?: string }>();
  const slug = (slugOverride || params.slug || "").toLowerCase();
  const page: Page = (SUB_PAGES.includes(params.page || "") ? params.page : "home") as Page;
  const { formatDims } = useUnitPreference();

  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState<SiteData | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [lightbox, setLightbox] = useState<Artwork | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) { setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_artist_site", { _key: slug });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) { setLoading(false); return; }
      setSite(row as unknown as SiteData);

      let query = supabase
        .from("artworks")
        .select("id, title, year, medium, height, width, depth, image_url")
        .eq("owner_id", row.user_id)
        .eq("role_context", "artist")
        .order("year", { ascending: false, nullsFirst: false });
      if (Array.isArray(row.artwork_ids) && row.artwork_ids.length > 0) {
        query = query.in("id", row.artwork_ids);
      }
      const { data: aws } = await query;
      const list = (aws as Omit<Artwork, "images">[]) || [];
      if (list.length > 0) {
        const { data: imgs } = await supabase
          .from("artwork_images")
          .select("artwork_id, storage_path, web_storage_path, display_order")
          .in("artwork_id", list.map((a) => a.id))
          .order("display_order", { ascending: true });
        const map = new Map<string, Artwork["images"]>();
        (imgs || []).forEach((img) => {
          if (!map.has(img.artwork_id)) map.set(img.artwork_id, []);
          const artworkImages = map.get(img.artwork_id);
          if (artworkImages) artworkImages.push(img);
        });
        setArtworks(list.map((a) => ({ ...a, images: map.get(a.id) || [] })));
      }
      setLoading(false);
    })();
  }, [slug]);

  const artworkImage = (aw: Artwork): string | null => {
    const first = aw.images[0];
    if (first) {
      const bucket = first.web_storage_path ? "artwork-images-web" : "artwork-images";
      const path = first.web_storage_path || first.storage_path;
      return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    return aw.image_url;
  };

  const portraitUrl = useMemo(() => {
    if (!site?.avatar_url) return null;
    if (site.avatar_url.startsWith("http")) return site.avatar_url;
    return supabase.storage.from("profile-photos").getPublicUrl(site.avatar_url).data.publicUrl;
  }, [site?.avatar_url]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>;
  }

  if (!site) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-serif text-2xl">This website is not available</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The address may be incorrect, or the artist has not published their website yet.
        </p>
        <Link to="/" className="text-sm underline underline-offset-4">Global Artist Registry Foundation</Link>
      </div>
    );
  }

  const name = site.site_title || site.full_name || "Artist";
  const base = `/site/${site.slug}`;
  const nav: { key: Page; label: string; to: string }[] = [
    { key: "home", label: name, to: base },
    { key: "works", label: "Works", to: `${base}/works` },
    { key: "about", label: "About", to: `${base}/about` },
    { key: "contact", label: "Contact", to: `${base}/contact` },
  ];

  const showEmail = site.contact_options?.email && site.email;
  const showPhone = site.contact_options?.phone && site.phone;
  const galleryList = site.contact_options?.gallery && Array.isArray(site.galleries) ? site.galleries : [];
  const featuredArtwork = artworks.find((artwork) => artwork.id === site.home_featured_artwork_id);
  const requestedHomeArtworks = Array.isArray(site.home_artwork_ids) ? site.home_artwork_ids : [];
  const homeArtworks = (requestedHomeArtworks.length > 0
    ? requestedHomeArtworks.map((id) => artworks.find((artwork) => artwork.id === id)).filter((artwork): artwork is Artwork => Boolean(artwork))
    : artworks
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-6 py-6">
          <Link to={base} className="font-serif text-xl">{name}</Link>
          <nav className="flex gap-6 text-sm">
            {nav.slice(1).map((n) => (
              <Link
                key={n.key}
                to={n.to}
                className={page === n.key ? "underline underline-offset-4" : "text-muted-foreground hover:text-foreground"}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className={`mx-auto max-w-5xl px-6 ${page === "contact" ? "py-20 sm:py-28" : "py-14 sm:py-20"}`}>
        {page === "home" && (
          <div className={site.home_layout === "grid" ? "space-y-10" : "grid items-center gap-10 sm:grid-cols-2"}>
            <div>
              {site.legacy_mode && (
                <p className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">Preserved by the Global Artist Registry Foundation</p>
              )}
              <h1 className="font-serif text-4xl leading-tight sm:text-5xl">{name}</h1>
              {site.tagline && <p className="mt-4 text-lg text-muted-foreground">{site.tagline}</p>}
              {(site.city || site.country) && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {[site.city, site.country].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="mt-8 flex gap-4">
                <Link to={`${base}/works`} className="inline-flex items-center gap-2 rounded-md bg-tone-2 px-5 py-2.5 text-sm text-primary-foreground hover:opacity-90">
                  View works <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to={`${base}/contact`} className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm hover:bg-accent">
                  Contact
                </Link>
              </div>
            </div>
            {(site.home_layout === "portrait" || !site.home_layout) && portraitUrl && (
              <img src={portraitUrl} alt={`Portrait of ${name}`} className="aspect-[4/5] w-full rounded-md object-cover" loading="lazy" />
            )}
            {site.home_layout === "featured" && featuredArtwork && artworkImage(featuredArtwork) && (
              <button type="button" onClick={() => setLightbox(featuredArtwork)} className="group text-left">
                <img src={artworkImage(featuredArtwork) || ""} alt={featuredArtwork.title} className="max-h-[68vh] w-full rounded-md object-contain" loading="lazy" />
                <p className="mt-3 text-sm font-medium">{featuredArtwork.title}{featuredArtwork.year ? `, ${featuredArtwork.year}` : ""}</p>
              </button>
            )}
            {site.home_layout === "grid" && homeArtworks.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {homeArtworks.map((artwork) => {
                  const src = artworkImage(artwork);
                  return (
                    <button type="button" key={artwork.id} onClick={() => setLightbox(artwork)} className="group text-left">
                      <div className="aspect-square overflow-hidden rounded-md bg-muted">
                        {src ? <img src={src} alt={artwork.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>}
                      </div>
                      <p className="mt-2 truncate text-xs font-medium">{artwork.title}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {page === "works" && (
          <div>
            <h1 className="font-serif text-3xl">Works</h1>
            {artworks.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No works are shown here yet.</p>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
                {artworks.map((aw) => {
                  const src = artworkImage(aw);
                  return (
                    <button key={aw.id} onClick={() => setLightbox(aw)} className="group text-left">
                      <div className="aspect-square overflow-hidden rounded-md bg-muted">
                        {src ? (
                          <img src={src} alt={aw.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">{aw.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[aw.year, aw.medium].filter(Boolean).join(", ")}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {page === "about" && (
          <div className="max-w-2xl">
            <h1 className="font-serif text-3xl">About</h1>
            <div className="mt-6 flex items-start gap-6">
              {portraitUrl && (
                <img src={portraitUrl} alt={`Portrait of ${name}`} className="hidden w-40 rounded-md object-cover sm:block" loading="lazy" />
              )}
              <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {site.about_text || site.biography || "This artist has not added a biography yet."}
              </div>
            </div>
            {site.birth_year && <p className="mt-6 text-sm text-muted-foreground">Born {site.birth_year}</p>}
          </div>
        )}

        {page === "contact" && (
          <div className="max-w-3xl">
            <h1 className="font-serif text-3xl">Contact</h1>
            <div className="mt-10 space-y-5 text-sm">
              {showEmail && (
                <a href={`mailto:${site.email}`} className="flex items-center gap-5 hover:underline underline-offset-4">
                  <Mail className="h-7 w-7 stroke-[1.5]" aria-hidden="true" /> {site.email}
                </a>
              )}
              {showPhone && (
                <p className="flex items-center gap-5">
                  <PhoneCall className="h-7 w-7 stroke-[1.5]" aria-hidden="true" /> {site.phone_prefix} {site.phone}
                </p>
              )}
              {site.website && (
                <a href={site.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline underline-offset-4">
                  <Globe className="h-4 w-4 text-muted-foreground" /> {site.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {Array.isArray(site.social_media_links) && site.social_media_links.length > 0 && (
                <div className="flex flex-wrap items-center gap-7 pt-7">
                  {site.social_media_links.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center text-foreground transition-opacity hover:opacity-55"
                      aria-label={`${name} on ${s.platform}`}
                      title={s.platform}
                    >
                      <SocialPlatformIcon platform={s.platform} className="h-7 w-7" />
                    </a>
                  ))}
                </div>
              )}
              {galleryList.length > 0 && (
                <div className="pt-8">
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Represented by</h2>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    {galleryList.map((g, i) => {
                      const place = [g.city, g.country].filter(Boolean).join(", ");
                      return (
                        <div key={i} className="overflow-hidden rounded-md border border-border">
                          {g.photo_url && (
                            <img
                              src={g.photo_url}
                              alt={`${g.name} gallery`}
                              className="h-40 w-full object-cover"
                              loading="lazy"
                            />
                          )}
                          <div className="space-y-2 p-4">
                            {g.website ? (
                              <a href={g.website} target="_blank" rel="noreferrer" className="font-medium hover:underline underline-offset-4">{g.name}</a>
                            ) : (
                              <span className="font-medium">{g.name}</span>
                            )}
                            {g.description && (
                              <p className="text-xs leading-relaxed text-muted-foreground">{g.description}</p>
                            )}
                            {(g.address || place) && (
                              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{[g.address, place].filter(Boolean).join(", ")}</span>
                              </p>
                            )}
                            {g.hours && (
                              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{g.hours}</span>
                              </p>
                            )}
                            {g.phone && (
                              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                                <PhoneCall className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{g.phone}</span>
                              </p>
                            )}
                            {g.email && (
                              <a href={`mailto:${g.email}`} className="flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground">
                                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{g.email}</span>
                              </a>
                            )}
                            {g.website && (
                              <a href={g.website} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground">
                                <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{g.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {!showEmail && !showPhone && galleryList.length === 0 && (
                <p className="text-muted-foreground">Please use the Foundation's <Link to="/contact" className="underline underline-offset-4">contact page</Link> to reach this artist.</p>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {name}</span>
          <Link to="/" className="hover:text-foreground">Hosted by the Global Artist Registry Foundation</Link>
        </div>
      </footer>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-background p-2" onClick={() => setLightbox(null)} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <div className="max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {artworkImage(lightbox) && (
              <img src={artworkImage(lightbox) || ""} alt={lightbox.title} className="max-h-[70vh] w-full rounded-md object-contain" />
            )}
            <div className="mt-4 text-center text-sm text-white">
              <p className="font-medium">{lightbox.title}{lightbox.year ? `, ${lightbox.year}` : ""}</p>
              <p className="text-white/70">
                {[lightbox.medium, formatDims(lightbox.height, lightbox.width, lightbox.depth)].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistSite;
