import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { SocialPlatformIcon } from "@/components/SocialLinks";
import ImageLightbox from "@/components/ImageLightbox";
import {
  fetchPublicArtworkImages,
  groupPublicArtworkImages,
  publicArtworkImageUrl,
  PROTECTED_WORK_NOTE,
} from "@/lib/publicArtworkImages";


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
interface SiteExImage { id: string; exhibition_id: string; caption: string | null; publicUrl: string }
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
  images: { id: string; url: string | null; protected: boolean }[];
  protected_display?: boolean | null;

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
  const [cvEntries, setCvEntries] = useState<CvEntry[]>([]);
  const [exhibitions, setExhibitions] = useState<SiteExhibition[]>([]);
  const [exImages, setExImages] = useState<Record<string, SiteExImage[]>>({});
  const [exViewer, setExViewer] = useState<{ exId: string; index: number } | null>(null);
  const [catalogues, setCatalogues] = useState<SiteCatalogue[]>([]);
  const [news, setNews] = useState<SiteNews[]>([]);

  useEffect(() => {
    (async () => {
      if (!slug) { setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_artist_site", { _key: slug });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) { setLoading(false); return; }
      setSite(row as unknown as SiteData);

      let query = supabase
        .from("artworks")
        .select("id, title, year, medium, height, width, depth, image_url, protected_display")

        .eq("owner_id", row.user_id)
        .eq("role_context", "artist")
        .order("year", { ascending: false, nullsFirst: false });
      if (Array.isArray(row.artwork_ids) && row.artwork_ids.length > 0) {
        // Always keep the home page picks loadable, even if they were later
        // unticked on the Works page, so the front page never loses its image.
        const homeIds = [
          row.home_featured_artwork_id,
          ...(Array.isArray(row.home_artwork_ids) ? row.home_artwork_ids : []),
        ].filter((id): id is string => Boolean(id));
        query = query.in("id", Array.from(new Set([...row.artwork_ids, ...homeIds])));
      }
      const { data: aws } = await query;
      const list = (aws as Omit<Artwork, "images">[]) || [];
      if (list.length > 0) {
        // Protected works only ever hand out the small watermarked version.
        const rows = await fetchPublicArtworkImages(list.map((a) => a.id));
        const grouped = groupPublicArtworkImages(rows);
        setArtworks(
          list.map((a) => ({
            ...a,
            images: (grouped.get(a.id) || []).map((img) => ({
              id: img.id,
              url: publicArtworkImageUrl(img),
              protected: img.protected,
            })),
          })),
        );
      }

      const sections = (row.sections || {}) as Record<string, boolean>;

      if (sections.cv_web || sections.cv_pdf) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", row.user_id)
          .maybeSingle();
        if (profileRow?.id) {
          const { data: entries } = await supabase
            .from("cv_entries")
            .select("id, section, entry_text, year, display_order")
            .eq("profile_id", profileRow.id)
            .order("display_order", { ascending: true });
          setCvEntries((entries as CvEntry[]) || []);
        }
      }

      if (sections.exh_solo || sections.exh_group || sections.exh_upcoming) {
        const { data: exs } = await supabase
          .from("exhibitions")
          .select("id, title, exhibition_type, opening_date, closing_date, venue, city, country, curator, description")
          .eq("user_id", row.user_id)
          .order("opening_date", { ascending: false, nullsFirst: false });
        const exList = (exs as SiteExhibition[]) || [];
        setExhibitions(exList);
        if (exList.length > 0) {
          const { data: imgs } = await supabase
            .from("exhibition_images")
            .select("id, exhibition_id, storage_path, web_storage_path, caption, display_order")
            .in("exhibition_id", exList.map((e) => e.id))
            .order("display_order", { ascending: true });
          const grouped: Record<string, SiteExImage[]> = {};
          (imgs || []).forEach((img) => {
            const bucket = img.web_storage_path ? "exhibition-images-web" : "exhibition-images";
            const path = img.web_storage_path || img.storage_path;
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
            if (!grouped[img.exhibition_id]) grouped[img.exhibition_id] = [];
            grouped[img.exhibition_id].push({ id: img.id, exhibition_id: img.exhibition_id, caption: img.caption, publicUrl: urlData.publicUrl });
          });
          setExImages(grouped);
        }
      }

      if (sections.publications) {
        const { data: cats } = await supabase
          .from("catalogues")
          .select("id, title, publication_year, publisher, authors, isbn, cover_image_path")
          .eq("user_id", row.user_id)
          .order("publication_year", { ascending: false, nullsFirst: false });
        setCatalogues((cats as SiteCatalogue[]) || []);
      }

      if (sections.news) {
        const { data: posts } = await supabase
          .from("artist_news")
          .select("id, title, body, news_date")
          .eq("user_id", row.user_id)
          .eq("is_published", true)
          .order("news_date", { ascending: false });
        setNews((posts as SiteNews[]) || []);
      }

      setLoading(false);
    })();
  }, [slug]);

  const artworkImage = (aw: Artwork): string | null => {
    const first = aw.images[0];
    if (first) return first.url;
    // A protected work never falls back to an external full-size image.
    return aw.protected_display ? null : aw.image_url;
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
  const sections = site.sections || {};
  const showExhibitions = Boolean(sections.exh_solo || sections.exh_group || sections.exh_upcoming);
  const nav: { key: Page; label: string; to: string }[] = [
    { key: "home", label: name, to: base },
    { key: "works", label: "Works", to: `${base}/works` },
    ...(showExhibitions ? [{ key: "exhibitions" as Page, label: "Exhibitions", to: `${base}/exhibitions` }] : []),
    ...(sections.publications ? [{ key: "publications" as Page, label: "Publications", to: `${base}/publications` }] : []),
    ...(sections.cv_web || sections.cv_pdf ? [{ key: "cv" as Page, label: "CV", to: `${base}/cv` }] : []),
    ...(sections.news ? [{ key: "news" as Page, label: "News", to: `${base}/news` }] : []),
    { key: "about", label: "About", to: `${base}/about` },
    { key: "contact", label: "Contact", to: `${base}/contact` },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = exhibitions.filter((ex) => (ex.opening_date || "") > today);
  const past = exhibitions.filter((ex) => !((ex.opening_date || "") > today));
  const soloList = past.filter((ex) => ex.exhibition_type === "solo");
  const groupList = past.filter((ex) => ex.exhibition_type === "group");
  const cvSections = Array.from(new Set(cvEntries.map((entry) => entry.section)));
  const exhibitionLine = (ex: SiteExhibition) =>
    [ex.venue, [ex.city, ex.country].filter(Boolean).join(", ")].filter(Boolean).join(", ");
  const exhibitionYear = (ex: SiteExhibition) => (ex.opening_date ? ex.opening_date.slice(0, 4) : "");

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
      <header className="border-b border-border print:hidden">
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
                          <img
                            src={src}
                            alt={aw.title}
                            loading="lazy"
                            draggable={aw.protected_display ? false : undefined}
                            onContextMenu={aw.protected_display ? (e) => e.preventDefault() : undefined}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">{aw.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[aw.year, aw.medium].filter(Boolean).join(", ")}
                      </p>
                      {aw.protected_display && (
                        <p className="mt-1 text-[11px] text-muted-foreground">{PROTECTED_WORK_NOTE}</p>
                      )}
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
        {page === "exhibitions" && showExhibitions && (
          <div className="mx-auto max-w-3xl px-6 py-16 print:py-0">
            <h1 className="font-serif text-2xl">Exhibitions</h1>
            {exhibitions.length === 0 && (
              <p className="mt-8 text-sm text-muted-foreground">Exhibitions will appear here shortly.</p>
            )}
            {[
              { show: Boolean(sections.exh_upcoming), title: "Upcoming", list: upcoming },
              { show: Boolean(sections.exh_solo), title: "Solo exhibitions", list: soloList },
              { show: Boolean(sections.exh_group), title: "Group exhibitions", list: groupList },
            ]
              .filter((block) => block.show && block.list.length > 0)
              .map((block) => (
                <section key={block.title} className="mt-12">
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground">{block.title}</h2>
                  <ul className="mt-5 divide-y divide-border border-t border-border">
                    {block.list.map((ex) => (
                      <li key={ex.id} className="py-5">
                        <div className="flex items-start gap-4">
                          {(exImages[ex.id]?.length ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => setExViewer({ exId: ex.id, index: 0 })}
                              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-secondary"
                              aria-label={`View ${exImages[ex.id].length} installation photo${exImages[ex.id].length > 1 ? "s" : ""} from ${ex.title}`}
                            >
                              <img
                                src={exImages[ex.id][0].publicUrl}
                                alt={exImages[ex.id][0].caption || `Installation view, ${ex.title}`}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                              {exImages[ex.id].length > 1 && (
                                <span className="absolute bottom-1 right-1 rounded-sm bg-background/90 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  +{exImages[ex.id].length - 1}
                                </span>
                              )}
                            </button>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {ex.title}
                              {exhibitionYear(ex) ? <span className="text-muted-foreground">, {exhibitionYear(ex)}</span> : null}
                            </p>
                            {exhibitionLine(ex) && <p className="mt-1 text-sm text-muted-foreground">{exhibitionLine(ex)}</p>}
                            {ex.curator && <p className="mt-1 text-xs text-muted-foreground">Curated by {ex.curator}</p>}
                            {(exImages[ex.id]?.length ?? 0) > 0 && exImages[ex.id][0].caption && (
                              <p className="mt-1 text-[11px] text-muted-foreground/70">{exImages[ex.id][0].caption}</p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )}

        {page === "publications" && sections.publications && (
          <div className="mx-auto max-w-4xl px-6 py-16">
            <h1 className="font-serif text-2xl">Publications</h1>
            {catalogues.length === 0 ? (
              <p className="mt-8 text-sm text-muted-foreground">Publications will appear here shortly.</p>
            ) : (
              <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {catalogues.map((cat) => {
                  const cover = cat.cover_image_path
                    ? supabase.storage.from("catalogue-covers").getPublicUrl(cat.cover_image_path).data.publicUrl
                    : null;
                  return (
                    <article key={cat.id}>
                      {cover && <img src={cover} alt={cat.title} loading="lazy" className="mb-4 w-full object-contain" />}
                      <p className="text-sm font-medium">{cat.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[cat.publisher, cat.publication_year].filter(Boolean).join(", ")}
                      </p>
                      {cat.authors && <p className="mt-1 text-xs text-muted-foreground">{cat.authors}</p>}
                      {cat.isbn && <p className="mt-1 text-xs text-muted-foreground">ISBN {cat.isbn}</p>}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {page === "cv" && (sections.cv_web || sections.cv_pdf) && (
          <div className="mx-auto max-w-3xl px-6 py-16">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-serif text-2xl">Curriculum Vitae</h1>
              {sections.cv_pdf && cvEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-sm underline underline-offset-4 print:hidden"
                >
                  Download as PDF
                </button>
              )}
            </div>
            {cvEntries.length === 0 ? (
              <p className="mt-8 text-sm text-muted-foreground">The CV will appear here shortly.</p>
            ) : !sections.cv_web ? (
              <p className="mt-8 text-sm text-muted-foreground print:hidden">
                Use the download above to save this CV.
              </p>
            ) : null}
            {cvEntries.length > 0 && (
              <div className={sections.cv_web ? "" : "hidden print:block"}>
                {cvSections.map((section) => (
                  <section key={section} className="mt-12">
                    <h2 className="text-xs uppercase tracking-widest text-muted-foreground">{section}</h2>
                    <ul className="mt-5 space-y-3 border-t border-border pt-5">
                      {cvEntries
                        .filter((entry) => entry.section === section)
                        .map((entry) => (
                          <li key={entry.id} className="flex gap-4 text-sm">
                            <span className="w-14 shrink-0 text-muted-foreground">{entry.year || ""}</span>
                            <span>{entry.entry_text}</span>
                          </li>
                        ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {page === "news" && sections.news && (
          <div className="mx-auto max-w-2xl px-6 py-16">
            <h1 className="font-serif text-2xl">News</h1>
            {news.length === 0 ? (
              <p className="mt-8 text-sm text-muted-foreground">News will appear here shortly.</p>
            ) : (
              <ul className="mt-10 divide-y divide-border border-t border-border">
                {news.map((post) => (
                  <li key={post.id} className="py-8">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">{post.news_date}</p>
                    <h2 className="mt-2 font-serif text-lg">{post.title}</h2>
                    {post.body && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{post.body}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {name}</span>
          <Link to="/" className="hover:text-foreground">Hosted by the Global Artist Registry Foundation</Link>
        </div>
      </footer>

      {exViewer && (exImages[exViewer.exId]?.length ?? 0) > 0 && (
        <ImageLightbox
          images={exImages[exViewer.exId].map((i) => i.publicUrl)}
          index={Math.min(exViewer.index, exImages[exViewer.exId].length - 1)}
          caption={exImages[exViewer.exId][Math.min(exViewer.index, exImages[exViewer.exId].length - 1)]?.caption || undefined}
          onIndexChange={(i) => setExViewer({ exId: exViewer.exId, index: i })}
          onClose={() => setExViewer(null)}
        />
      )}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-background p-2" onClick={() => setLightbox(null)} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <div className="max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {artworkImage(lightbox) && (
              <img
                src={artworkImage(lightbox) || ""}
                alt={lightbox.title}
                draggable={lightbox.protected_display ? false : undefined}
                onContextMenu={lightbox.protected_display ? (e) => e.preventDefault() : undefined}
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
            )}
            <div className="mt-4 text-center text-sm text-white">
              <p className="font-medium">{lightbox.title}{lightbox.year ? `, ${lightbox.year}` : ""}</p>
              <p className="text-white/70">
                {[lightbox.medium, formatDims(lightbox.height, lightbox.width, lightbox.depth)].filter(Boolean).join(" · ")}
              </p>
              {lightbox.protected_display && (
                <p className="mt-2 text-[11px] text-white/60">{PROTECTED_WORK_NOTE}</p>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistSite;
