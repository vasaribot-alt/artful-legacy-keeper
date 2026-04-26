import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDimensions } from "@/lib/formatDimensions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FoundingArtistBadge } from "@/components/FoundingArtistBadge";
import {
  Globe,
  Mail,
  MapPin,
  ExternalLink,
  Building2,
  Phone,
  ArrowLeft,
  Calendar,
  Layers,
  Image as ImageIcon,
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialLink { platform: string; url: string; }
interface Gallery { name: string; phone: string; website: string; }

interface ProfileData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  birth_year: number | null;
  city: string | null;
  country: string | null;
  studio_address: string | null;
  phone_prefix: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  social_media_links: SocialLink[];
  galleries: Gallery[];
  biography: string | null;
  chronology: string | null;
  global_artist_id: number;
  profile_id: string;
  contact_visibility: {
    studio_address?: boolean;
    phone?: boolean;
    email?: boolean;
    website?: boolean;
  };
}

interface Exhibition {
  id: string;
  title: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  opening_date: string | null;
  closing_date: string | null;
  exhibition_type: string;
  curator: string | null;
  description: string | null;
  exhibition_text: string | null;
  images: { storage_path: string; caption: string | null }[];
}

interface ArtworkPublic {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
  dimensions: string | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  series: string | null;
  image_url: string | null;
  images: { storage_path: string; display_order: number }[];
}

const PublicArtistProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [foundingTier, setFoundingTier] = useState<string | null>(null);
  const [cvSections, setCvSections] = useState<
    { section: string; entries: { year: string; entry_text: string }[] }[]
  >([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [artworks, setArtworks] = useState<ArtworkPublic[]>([]);
  const [seriesGroups, setSeriesGroups] = useState<string[]>([]);

  // Navigation state
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [exhibitionFilter, setExhibitionFilter] = useState<"solo" | "group">("solo");
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const [openExhibitionId, setOpenExhibitionId] = useState<string | null>(null);
  const [lightboxArtwork, setLightboxArtwork] = useState<ArtworkPublic | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      const isNumeric = /^\d+$/.test(id);
      let query = supabase.from("profiles").select("*");
      if (isNumeric) {
        query = query.eq("global_artist_id", parseInt(id));
      } else {
        query = query.eq("user_id", id);
      }

      const { data, error } = await query.single();
      if (error || !data) { setLoading(false); return; }

      const userId = data.user_id;

      setProfile({
        user_id: userId,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        birth_year: data.birth_year,
        city: data.city,
        country: data.country,
        studio_address: data.studio_address,
        phone_prefix: data.phone_prefix,
        phone: data.phone,
        email: data.email,
        website: data.website,
        social_media_links: (data.social_media_links as any) || [],
        galleries: (data.galleries as any) || [],
        biography: data.biography,
        chronology: data.chronology,
        global_artist_id: data.global_artist_id,
        profile_id: data.id,
        contact_visibility: ((data as any).contact_visibility as any) || {},
      });

      const [cvRes, foundingRes, exhibitionsRes, artworksRes, seriesRes] = await Promise.all([
        supabase.from("cv_entries").select("section, year, entry_text")
          .eq("profile_id", data.id).order("display_order", { ascending: true }),
        supabase.from("founding_artists").select("tier")
          .eq("user_id", userId).maybeSingle(),
        supabase.from("exhibitions").select("id, title, venue, city, country, opening_date, closing_date, exhibition_type, curator, description, exhibition_text")
          .eq("user_id", userId).eq("hide_from_cv", false).order("opening_date", { ascending: false }),
        supabase.from("artworks").select("id, title, year, medium, dimensions, height, width, depth, series, image_url")
          .eq("owner_id", userId).order("year", { ascending: false }),
        supabase.from("series_groups").select("name")
          .eq("user_id", userId).order("name"),
      ]);

      if (cvRes.data && cvRes.data.length > 0) {
        const sectionMap = new Map<string, { year: string; entry_text: string }[]>();
        for (const e of cvRes.data) {
          const section = e.section || "Other";
          if (!sectionMap.has(section)) sectionMap.set(section, []);
          sectionMap.get(section)!.push({ year: e.year || "", entry_text: e.entry_text || "" });
        }
        setCvSections(Array.from(sectionMap.entries()).map(([section, entries]) => ({ section, entries })));
      }

      if (foundingRes.data) setFoundingTier(foundingRes.data.tier);

      if (exhibitionsRes.data && exhibitionsRes.data.length > 0) {
        const exIds = exhibitionsRes.data.map(e => e.id);
        const { data: exImages } = await supabase.from("exhibition_images")
          .select("exhibition_id, storage_path, caption")
          .in("exhibition_id", exIds)
          .order("display_order", { ascending: true });

        const imageMap = new Map<string, { storage_path: string; caption: string | null }[]>();
        for (const img of exImages || []) {
          if (!imageMap.has(img.exhibition_id)) imageMap.set(img.exhibition_id, []);
          imageMap.get(img.exhibition_id)!.push({ storage_path: img.storage_path, caption: img.caption });
        }

        setExhibitions(exhibitionsRes.data.map(ex => ({
          ...ex,
          images: imageMap.get(ex.id) || [],
        })));
      }

      if (artworksRes.data && artworksRes.data.length > 0) {
        const awIds = artworksRes.data.map(a => a.id);
        const { data: awImages } = await supabase.from("artwork_images")
          .select("artwork_id, storage_path, display_order")
          .in("artwork_id", awIds)
          .order("display_order", { ascending: true });

        const imgMap = new Map<string, { storage_path: string; display_order: number }[]>();
        for (const img of awImages || []) {
          if (!imgMap.has(img.artwork_id)) imgMap.set(img.artwork_id, []);
          imgMap.get(img.artwork_id)!.push({ storage_path: img.storage_path, display_order: img.display_order });
        }

        setArtworks(artworksRes.data.map(aw => ({
          ...aw,
          images: imgMap.get(aw.id) || [],
        })));
      }

      if (seriesRes.data) setSeriesGroups(seriesRes.data.map(s => s.name));

      setLoading(false);
    };
    load();
  }, [id]);

  const avatarSrc = profile?.avatar_url
    ? profile.avatar_url.startsWith("http")
      ? profile.avatar_url
      : supabase.storage.from("profile-photos").getPublicUrl(profile.avatar_url).data.publicUrl
    : undefined;

  const location = profile ? [profile.city, profile.country].filter(Boolean).join(", ") : "";

  const getArtworkThumb = (aw: ArtworkPublic) => {
    if (aw.images.length > 0) {
      return supabase.storage.from("artwork-images").getPublicUrl(aw.images[0].storage_path).data.publicUrl;
    }
    if (aw.image_url) return aw.image_url;
    return null;
  };

  const getArtworkImageUrls = (aw: ArtworkPublic): string[] => {
    const urls = aw.images
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((img) => supabase.storage.from("artwork-images").getPublicUrl(img.storage_path).data.publicUrl);
    if (urls.length === 0 && aw.image_url) urls.push(aw.image_url);
    return urls;
  };

  const openLightbox = (aw: ArtworkPublic) => {
    setLightboxArtwork(aw);
    setLightboxIndex(0);
  };

  const closeLightbox = () => setLightboxArtwork(null);

  useEffect(() => {
    if (!lightboxArtwork) return;
    const imgs = getArtworkImageUrls(lightboxArtwork);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i + 1) % Math.max(imgs.length, 1));
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i - 1 + imgs.length) % Math.max(imgs.length, 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxArtwork]);

  const getExhibitionThumb = (ex: Exhibition) => {
    if (ex.images.length > 0) {
      return supabase.storage.from("exhibition-images").getPublicUrl(ex.images[0].storage_path).data.publicUrl;
    }
    return null;
  };

  const formatDims = (aw: ArtworkPublic) => {
    if (aw.dimensions) return aw.dimensions;
    return formatDimensions(aw.height ?? null, aw.width ?? null, aw.depth ?? null);
  };

  const formatExDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const artworksBySeries = (() => {
    const grouped: { series: string; items: ArtworkPublic[] }[] = [];
    const seriesMap = new Map<string, ArtworkPublic[]>();
    const unsorted: ArtworkPublic[] = [];

    for (const aw of artworks) {
      if (aw.series && seriesGroups.includes(aw.series)) {
        if (!seriesMap.has(aw.series)) seriesMap.set(aw.series, []);
        seriesMap.get(aw.series)!.push(aw);
      } else {
        unsorted.push(aw);
      }
    }

    for (const s of seriesGroups) {
      if (seriesMap.has(s)) grouped.push({ series: s, items: seriesMap.get(s)! });
    }
    if (unsorted.length > 0) grouped.push({ series: "Other Works", items: unsorted });
    return grouped;
  })();

  const getSeriesThumb = (seriesName: string) => {
    const group = artworksBySeries.find(g => g.series === seriesName);
    if (!group || group.items.length === 0) return null;
    return getArtworkThumb(group.items[0]);
  };

  const filteredExhibitions = exhibitions.filter(ex => ex.exhibition_type === exhibitionFilter);

  const soloCount = exhibitions.filter(e => e.exhibition_type === "solo").length;
  const groupCount = exhibitions.filter(e => e.exhibition_type === "group").length;

  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? null : section);
  };

  const hasCv = cvSections.length > 0;
  const hasExhibitions = exhibitions.length > 0;
  const hasArtworks = artworks.length > 0;
  const hasNavSections = hasCv || hasExhibitions || hasArtworks;

  const handleDownloadCv = () => {
    if (!profile || cvSections.length === 0) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const sectionsHtml = cvSections.map(s => `
      <h2>${s.section}</h2>
      <div class="entries">
        ${s.entries.map(e => `
          <div class="entry">
            <span class="year">${e.year || ""}</span>
            <span class="text">${(e.entry_text || "").replace(/</g, "&lt;")}</span>
          </div>
        `).join("")}
      </div>
    `).join("");

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>CV — ${profile.full_name || "Artist"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', system-ui, sans-serif; color: #111; padding: 48px; max-width: 800px; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { font-family: 'DM Serif Display', serif; font-size: 28px; margin-bottom: 8px; letter-spacing: -0.01em; }
  .subtitle { font-size: 13px; color: #666; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 0.1em; }
  h2 { font-family: 'DM Serif Display', serif; font-size: 18px; margin-bottom: 16px; margin-top: 32px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5; letter-spacing: -0.01em; }
  .entry { display: flex; gap: 16px; margin-bottom: 8px; page-break-inside: avoid; }
  .year { font-family: monospace; font-size: 13px; color: #888; width: 60px; flex-shrink: 0; padding-top: 1px; }
  .text { font-size: 14px; color: #333; line-height: 1.5; flex: 1; }
  @media print { body { padding: 24px; } h2 { margin-top: 24px; } }
</style>
</head>
<body>
  <h1>${profile.full_name || "Artist"}</h1>
  <p class="subtitle">Curriculum Vitae</p>
  ${sectionsHtml}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); window.close(); }, 300); };</script>
</body>
</html>`);
    printWindow.document.close();
  };


  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Global Artist Registry Foundation
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/founding-artists" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Founding Artists
            </Link>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      ) : !profile ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-muted-foreground">Artist not found</p>
          <Link to="/founding-artists" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to Founding Artists
          </Link>
        </div>
      ) : (
        <>
          <header className="pt-16 pb-12 px-6">
            <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
              <Avatar className="w-32 h-32 border-4 border-border mb-8">
                {avatarSrc && <AvatarImage src={avatarSrc} alt={profile.full_name || "Artist"} />}
                <AvatarFallback className="text-4xl">
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>

              <h1 className="text-4xl sm:text-5xl mb-3">{profile.full_name || "Untitled Artist"}</h1>
              {foundingTier && <FoundingArtistBadge tier={foundingTier} className="mb-3" />}

              {(location || profile.birth_year) && (
                <p className="text-muted-foreground text-lg">
                  {profile.birth_year && <span>b. {profile.birth_year}</span>}
                  {profile.birth_year && location && <span> · </span>}
                  {location && <span>{location}</span>}
                </p>
              )}

              <span className="mt-4 text-xs px-3 py-1 rounded-sm bg-foreground text-background font-mono tracking-widest">
                GAR-{String(profile.global_artist_id).padStart(8, "0")}
              </span>
            </div>
          </header>

          <main className="max-w-4xl mx-auto px-6 pb-20">
            {/* Contact */}
            {(() => {
              const cv = profile.contact_visibility || {};
              const showEmail = cv.email !== false && !!profile.email;
              const showWebsite = cv.website !== false && !!profile.website;
              const showStudio = cv.studio_address !== false && !!profile.studio_address;
              if (!showEmail && !showWebsite && !showStudio) return null;
              return (
              <section className="mb-16 max-w-3xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {showEmail && (
                    <a href={`mailto:${profile.email}`} className="flex items-center gap-3 p-4 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">{profile.email}</span>
                    </a>
                  )}
                  {showWebsite && (
                    <a href={profile.website!.startsWith("http") ? profile.website! : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{profile.website!.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
                    </a>
                  )}
                  {showStudio && (
                    <div className="flex items-center gap-3 p-4 rounded-md bg-muted/50">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">{profile.studio_address}</span>
                    </div>
                  )}
                </div>
              </section>
              );
            })()}

            {/* Social links */}
            {profile.social_media_links.length > 0 && (
              <section className="mb-16 max-w-3xl mx-auto">
                <div className="flex flex-wrap gap-2 justify-center">
                  {profile.social_media_links.map((link, i) => (
                    <a key={i} href={link.url.startsWith("http") ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm hover:bg-muted transition-colors">
                      {link.platform || "Link"}
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Biography */}
            {profile.biography && (
              <section className="mb-16 max-w-3xl mx-auto">
                <h2 className="text-2xl mb-6">Biography</h2>
                <div className="text-foreground/80 leading-relaxed whitespace-pre-line text-[15px]">
                  {profile.biography}
                </div>
              </section>
            )}

            {/* Galleries */}
            {profile.galleries.length > 0 && (
              <section className="mb-16 max-w-3xl mx-auto">
                <h2 className="text-2xl mb-6">Gallery Representation</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.galleries.map((g, i) => (
                    <div key={i} className="p-5 rounded-md border border-border space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{g.name}</span>
                      </div>
                      {g.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="w-3 h-3" /> {g.phone}
                        </p>
                      )}
                      {g.website && (
                        <a href={g.website.startsWith("http") ? g.website : `https://${g.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors">
                          <Globe className="w-3 h-3" />
                          {g.website.replace(/^https?:\/\//, "")}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* === Navigation Cards === */}
            {hasNavSections && (
              <div className="max-w-3xl mx-auto">
                {/* Horizontal card navigation */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {hasArtworks && (
                    <button
                      onClick={() => toggleSection("works")}
                      className={`p-5 rounded-md border text-center transition-colors ${
                        openSection === "works"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <p className="font-medium text-sm sm:text-base">Artworks series</p>
                      <p className={`text-xs mt-1 ${openSection === "works" ? "text-background/70" : "text-muted-foreground"}`}>
                        {artworks.length} works
                      </p>
                    </button>
                  )}
                  {hasExhibitions && (
                    <button
                      onClick={() => {
                        toggleSection("exhibitions");
                        if (openSection !== "exhibitions") {
                          setExhibitionFilter(soloCount > 0 ? "solo" : "group");
                        }
                      }}
                      className={`p-5 rounded-md border text-center transition-colors ${
                        openSection === "exhibitions"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <p className="font-medium text-sm sm:text-base">Exhibitions</p>
                      <p className={`text-xs mt-1 ${openSection === "exhibitions" ? "text-background/70" : "text-muted-foreground"}`}>
                        {exhibitions.length} shows
                      </p>
                    </button>
                  )}
                  {hasCv && (
                    <button
                      onClick={() => toggleSection("cv")}
                      className={`p-5 rounded-md border text-center transition-colors ${
                        openSection === "cv"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <p className="font-medium text-sm sm:text-base">Curriculum Vitae</p>
                      <p className={`text-xs mt-1 ${openSection === "cv" ? "text-background/70" : "text-muted-foreground"}`}>
                        {cvSections.length} sections
                      </p>
                    </button>
                  )}
                </div>

                {/* Section content */}
                {openSection === "works" && (
                  <div className="space-y-1">
                    {artworksBySeries.map((group) => {
                      const thumb = getSeriesThumb(group.series);
                      const isOpen = openSeries === group.series;
                      return (
                        <div key={group.series}>
                          <button
                            ref={(el) => { if (el) el.dataset.series = group.series; }}
                            onClick={(e) => {
                              const el = e.currentTarget;
                              setOpenSeries(isOpen ? null : group.series);
                              if (!isOpen) {
                                requestAnimationFrame(() => {
                                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                                });
                              }
                            }}
                            className="w-full flex items-center gap-4 p-4 rounded-md hover:bg-muted/50 transition-colors text-left"
                          >
                            <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                            <span className="font-medium flex-1">{group.series}</span>
                            <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                              {thumb ? (
                                <img src={thumb} alt={group.series} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Layers className="w-4 h-4 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                          </button>

                          {isOpen && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-3 ml-8 mb-4">
                              {group.items.map((aw) => {
                                const awThumb = getArtworkThumb(aw);
                                const dims = formatDims(aw);
                                return (
                                  <div key={aw.id} className="group cursor-pointer" onClick={() => openLightbox(aw)}>
                                    <div className="aspect-[3/4] rounded-md overflow-hidden bg-muted mb-2">
                                      {awThumb ? (
                                        <img src={awThumb} alt={aw.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-sm font-medium truncate">{aw.title}</p>
                                    {aw.year && <p className="text-xs text-muted-foreground">{aw.year}</p>}
                                    {aw.medium && <p className="text-xs text-muted-foreground truncate">{aw.medium}</p>}
                                    {dims && <p className="text-xs text-muted-foreground">{dims}</p>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {openSection === "exhibitions" && (
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      {soloCount > 0 && (
                        <button
                          onClick={() => setExhibitionFilter("solo")}
                          className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                            exhibitionFilter === "solo"
                              ? "bg-foreground text-background border-foreground"
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          Solo ({soloCount})
                        </button>
                      )}
                      {groupCount > 0 && (
                        <button
                          onClick={() => setExhibitionFilter("group")}
                          className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                            exhibitionFilter === "group"
                              ? "bg-foreground text-background border-foreground"
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          Group ({groupCount})
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {filteredExhibitions.map((ex) => {
                        const thumb = getExhibitionThumb(ex);
                        const dateStr = [formatExDate(ex.opening_date), formatExDate(ex.closing_date)].filter(Boolean).join(" – ");
                        const loc = [ex.venue, ex.city, ex.country].filter(Boolean).join(", ");
                        const isExOpen = openExhibitionId === ex.id;
                        return (
                          <div key={ex.id}>
                            <button
                              onClick={() => setOpenExhibitionId(isExOpen ? null : ex.id)}
                              className={`w-full flex gap-4 p-4 rounded-md border text-left transition-colors ${
                                isExOpen ? "border-foreground bg-muted/50" : "border-border hover:bg-muted/30"
                              }`}
                            >
                              {thumb && (
                                <div className="w-20 h-20 rounded-md overflow-hidden shrink-0 bg-muted">
                                  <img src={thumb} alt={ex.title} className="w-full h-full object-cover" loading="lazy" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-medium text-sm">{ex.title}</h3>
                                  <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground shrink-0 capitalize">
                                    {ex.exhibition_type}
                                  </span>
                                </div>
                                {loc && <p className="text-sm text-muted-foreground mt-0.5">{loc}</p>}
                                {dateStr && <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>}
                              </div>
                            </button>

                            {isExOpen && (
                              <div className="mt-2 ml-4 mr-4 mb-2 space-y-4">
                                {ex.curator && <p className="text-sm text-muted-foreground">Curated by {ex.curator}</p>}
                                {ex.description && <p className="text-sm text-foreground/70 leading-relaxed">{ex.description}</p>}
                                {ex.exhibition_text && (
                                  <div className="text-sm text-foreground/70 leading-relaxed whitespace-pre-line">{ex.exhibition_text}</div>
                                )}

                                {ex.images.length > 0 && (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {ex.images.map((img, idx) => {
                                      const url = supabase.storage.from("exhibition-images").getPublicUrl(img.storage_path).data.publicUrl;
                                      return (
                                        <div key={idx} className="space-y-1">
                                          <div className="aspect-[4/3] rounded-md overflow-hidden bg-muted">
                                            <img src={url} alt={img.caption || ex.title} className="w-full h-full object-cover" loading="lazy" />
                                          </div>
                                          {img.caption && <p className="text-[11px] text-muted-foreground">{img.caption}</p>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {filteredExhibitions.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No {exhibitionFilter} exhibitions</p>
                      )}
                    </div>
                  </div>
                )}

                {openSection === "cv" && (
                  <div className="space-y-10">
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={handleDownloadCv} className="gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </Button>
                    </div>
                    {cvSections.map((section) => (
                      <div key={section.section}>
                        <h3 className="text-sm uppercase tracking-[0.15em] text-muted-foreground mb-4">
                          {section.section}
                        </h3>
                        <div className="space-y-2">
                          {section.entries.map((entry, i) => (
                            <div key={i} className="flex gap-4 text-sm">
                              {entry.year && (
                                <span className="text-muted-foreground font-mono w-12 shrink-0">{entry.year}</span>
                              )}
                              <span className="text-foreground/80">{entry.entry_text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chronology */}
            {profile.chronology && (
              <section className="mt-16 mb-16 max-w-3xl mx-auto">
                <h2 className="text-2xl mb-6">Chronology</h2>
                <div className="text-foreground/80 leading-relaxed whitespace-pre-line text-[15px]">
                  {profile.chronology}
                </div>
              </section>
            )}
          </main>

          <footer className="py-8 px-6 border-t border-border">
            <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">
                © 2026 Global Artist Registry Foundation
              </Link>
              <Link to="/founding-artists" className="hover:text-foreground transition-colors">
                Founding Artists
              </Link>
            </div>
          </footer>
        </>
      )}

      {lightboxArtwork && (() => {
        const imgs = getArtworkImageUrls(lightboxArtwork);
        const dims = formatDims(lightboxArtwork);
        return (
          <div
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="fixed top-4 right-4 z-[60] p-2 rounded-full bg-muted hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div
              className="min-h-full flex items-center justify-center px-6 py-16"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-3xl flex flex-col items-center">
                <div className="relative w-full flex items-center justify-center">
                  {imgs.length > 1 && (
                    <button
                      onClick={() => setLightboxIndex((i) => (i - 1 + imgs.length) % imgs.length)}
                      className="absolute -left-2 md:-left-12 p-2 rounded-full bg-background/80 hover:bg-background border border-border transition-colors z-10"
                      aria-label="Previous"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {imgs.length > 0 ? (
                    <img
                      src={imgs[lightboxIndex]}
                      alt={lightboxArtwork.title}
                      className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
                    />
                  ) : (
                    <div className="text-muted-foreground py-20">No image</div>
                  )}
                  {imgs.length > 1 && (
                    <button
                      onClick={() => setLightboxIndex((i) => (i + 1) % imgs.length)}
                      className="absolute -right-2 md:-right-12 p-2 rounded-full bg-background/80 hover:bg-background border border-border transition-colors z-10"
                      aria-label="Next"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="text-center mt-6 space-y-1 max-w-2xl">
                  <h3 className="font-serif text-lg italic">{lightboxArtwork.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {[lightboxArtwork.year, lightboxArtwork.medium, dims].filter(Boolean).join(" · ")}
                  </p>
                  {imgs.length > 1 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      {lightboxIndex + 1} / {imgs.length}
                    </p>
                  )}
                </div>

                {imgs.length > 1 && (
                  <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
                    {imgs.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setLightboxIndex(i)}
                        className={`w-14 h-14 rounded-md overflow-hidden border-2 shrink-0 transition-colors ${
                          i === lightboxIndex ? "border-foreground" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PublicArtistProfile;