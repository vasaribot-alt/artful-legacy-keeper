import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";

interface SocialLink {
  platform: string;
  url: string;
}

interface Gallery {
  name: string;
  phone: string;
  website: string;
}

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
}

const PublicArtistProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [foundingTier, setFoundingTier] = useState<string | null>(null);
  const [cvSections, setCvSections] = useState<
    { section: string; entries: { year: string; entry_text: string }[] }[]
  >([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      // Try to find profile by global_artist_id (numeric) or user_id (uuid)
      const isNumeric = /^\d+$/.test(id);
      let query = supabase.from("profiles").select("*");

      if (isNumeric) {
        query = query.eq("global_artist_id", parseInt(id));
      } else {
        query = query.eq("user_id", id);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      setProfile({
        user_id: data.user_id,
        full_name: data.full_name,
        avatar_url: (data as any).avatar_url,
        birth_year: (data as any).birth_year,
        city: (data as any).city,
        country: (data as any).country,
        studio_address: (data as any).studio_address,
        phone_prefix: (data as any).phone_prefix,
        phone: (data as any).phone,
        email: (data as any).email,
        website: (data as any).website,
        social_media_links: (data as any).social_media_links || [],
        galleries: (data as any).galleries || [],
        biography: (data as any).biography,
        chronology: (data as any).chronology,
        global_artist_id: data.global_artist_id,
        profile_id: data.id,
      });

      // Load CV entries
      const { data: entries } = await supabase
        .from("cv_entries")
        .select("section, year, entry_text")
        .eq("profile_id", data.id)
        .order("display_order", { ascending: true });

      if (entries && entries.length > 0) {
        const sectionMap = new Map<string, { year: string; entry_text: string }[]>();
        for (const e of entries) {
          const section = e.section || "Other";
          if (!sectionMap.has(section)) sectionMap.set(section, []);
          sectionMap.get(section)!.push({
            year: e.year || "",
            entry_text: e.entry_text || "",
          });
        }
        setCvSections(
          Array.from(sectionMap.entries()).map(([section, entries]) => ({
            section,
            entries,
          }))
        );
      }

      // Check founding artist status
      const { data: foundingData } = await supabase
        .from("founding_artists")
        .select("tier")
        .eq("user_id", data.user_id)
        .maybeSingle();
      if (foundingData) setFoundingTier(foundingData.tier);

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
  const phoneDisplay = profile ? [profile.phone_prefix, profile.phone].filter(Boolean).join(" ") : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
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
          {/* Hero */}
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

          <main className="max-w-3xl mx-auto px-6 pb-20">
            {/* Contact */}
            {(profile.email || profile.website || profile.studio_address) && (
              <section className="mb-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.email && (
                    <a
                      href={`mailto:${profile.email}`}
                      className="flex items-center gap-3 p-4 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">{profile.email}</span>
                    </a>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{profile.website.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
                    </a>
                  )}
                  {profile.studio_address && (
                    <div className="flex items-center gap-3 p-4 rounded-md bg-muted/50">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">{profile.studio_address}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Social links */}
            {profile.social_media_links.length > 0 && (
              <section className="mb-16">
                <div className="flex flex-wrap gap-2 justify-center">
                  {profile.social_media_links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm hover:bg-muted transition-colors"
                    >
                      {link.platform || "Link"}
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Biography */}
            {profile.biography && (
              <section className="mb-16">
                <h2 className="text-2xl mb-6">Biography</h2>
                <div className="text-foreground/80 leading-relaxed whitespace-pre-line text-[15px]">
                  {profile.biography}
                </div>
              </section>
            )}

            {/* Galleries */}
            {profile.galleries.length > 0 && (
              <section className="mb-16">
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
                        <a
                          href={g.website.startsWith("http") ? g.website : `https://${g.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors"
                        >
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

            {/* CV */}
            {cvSections.length > 0 && (
              <section className="mb-16">
                <h2 className="text-2xl mb-8">Curriculum Vitae</h2>
                <div className="space-y-10">
                  {cvSections.map((section) => (
                    <div key={section.section}>
                      <h3 className="text-sm uppercase tracking-[0.15em] text-muted-foreground mb-4">
                        {section.section}
                      </h3>
                      <div className="space-y-2">
                        {section.entries.map((entry, i) => (
                          <div key={i} className="flex gap-4 text-sm">
                            {entry.year && (
                              <span className="text-muted-foreground font-mono w-12 shrink-0">
                                {entry.year}
                              </span>
                            )}
                            <span className="text-foreground/80">{entry.entry_text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Chronology */}
            {profile.chronology && (
              <section className="mb-16">
                <h2 className="text-2xl mb-6">Chronology</h2>
                <div className="text-foreground/80 leading-relaxed whitespace-pre-line text-[15px]">
                  {profile.chronology}
                </div>
              </section>
            )}
          </main>

          {/* Footer */}
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
    </div>
  );
};

export default PublicArtistProfile;
