import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Globe,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Building2,
} from "lucide-react";
import { ViewLayout } from "@/components/ViewLayout";

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
}

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "instagram.com",
  Facebook: "facebook.com",
  "X (Twitter)": "x.com",
  LinkedIn: "linkedin.com",
  TikTok: "tiktok.com",
  YouTube: "youtube.com",
  Behance: "behance.net",
  Artsy: "artsy.net",
  Vimeo: "vimeo.com",
  Threads: "threads.net",
  Bluesky: "bsky.app",
  Pinterest: "pinterest.com",
  Tumblr: "tumblr.com",
};

const ArtistProfileView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [cvSections, setCvSections] = useState<
    { section: string; entries: { year: string; entry_text: string; images: { storage_path: string; caption: string | null }[] }[] }[]
  >([]);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      setProfile({
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
      });

      // Load CV entries
      const { data: entries } = await supabase
        .from("cv_entries")
        .select("*, cv_entry_images(*)")
        .eq("profile_id", data.id)
        .order("display_order", { ascending: true });

      if (entries && entries.length > 0) {
        const sectionMap = new Map<string, { year: string; entry_text: string; images: { storage_path: string; caption: string | null }[] }[]>();
        for (const e of entries) {
          const section = e.section || "Other";
          if (!sectionMap.has(section)) sectionMap.set(section, []);
          sectionMap.get(section)!.push({
            year: e.year || "",
            entry_text: e.entry_text || "",
            images: ((e as any).cv_entry_images || []).map((img: any) => ({
              storage_path: img.storage_path,
              caption: img.caption,
            })),
          });
        }
        setCvSections(
          Array.from(sectionMap.entries()).map(([section, entries]) => ({
            section,
            entries,
          }))
        );
      }

      setLoading(false);
    };
    load();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const phoneDisplay = [profile.phone_prefix, profile.phone].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-background">
      {/* Floating action bar */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="bg-background/80 backdrop-blur-sm border-border shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
        </Button>
        <Button
          size="sm"
          onClick={() => navigate("/profile")}
          className="gap-1.5 shadow-sm"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit Profile
        </Button>
      </div>

      {/* Hero section */}
      <header className="pt-20 pb-16 px-6">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
          <Avatar className="w-32 h-32 border-4 border-border mb-8">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || "Artist"} />
            <AvatarFallback className="text-4xl">
              {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "?"}
            </AvatarFallback>
          </Avatar>

          <h1 className="text-4xl sm:text-5xl mb-3">{profile.full_name || "Untitled Artist"}</h1>

          {(location || profile.birth_year) && (
            <p className="text-muted-foreground text-lg">
              {profile.birth_year && <span>b. {profile.birth_year}</span>}
              {profile.birth_year && location && <span> · </span>}
              {location && <span>{location}</span>}
            </p>
          )}

          <span className="mt-4 text-xs px-3 py-1 rounded-sm bg-foreground text-background font-mono tracking-widest">
            ID {profile.global_artist_id}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-20">
        {/* Contact info bar */}
        {(phoneDisplay || profile.email || profile.website || profile.studio_address) && (
          <section className="mb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {phoneDisplay && (
                <div className="flex items-center gap-3 p-4 rounded-md bg-muted/50">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{phoneDisplay}</span>
                </div>
              )}
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
          <>
            <section className="mb-16">
              <h2 className="text-2xl mb-6">Biography</h2>
              <div className="text-foreground/80 leading-relaxed whitespace-pre-line text-[15px]">
                {profile.biography}
              </div>
            </section>
          </>
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
            <div
              onClick={() => navigate("/profile/cv")}
              className="flex items-center justify-between p-5 rounded-md border border-border hover:bg-muted/50 transition-colors cursor-pointer group"
            >
              <div>
                <h2 className="text-xl mb-1">Curriculum Vitae</h2>
                <p className="text-sm text-muted-foreground">
                  {cvSections.length} section{cvSections.length !== 1 ? "s" : ""} ·{" "}
                  {cvSections.reduce((sum, s) => sum + s.entries.length, 0)} entries
                </p>
              </div>
              <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
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
    </div>
  );
};

export default ArtistProfileView;
