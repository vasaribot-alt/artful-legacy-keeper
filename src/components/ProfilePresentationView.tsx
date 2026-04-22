import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Globe, Phone, Mail, MapPin, ExternalLink, Building2, ShieldCheck, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const socialIcons: Record<string, React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/></svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z"/></svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"/></svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.3 0 .59.05.86.13V9.01a6.3 6.3 0 0 0-.86-.06 6.33 6.33 0 0 0-6.33 6.33A6.33 6.33 0 0 0 9.49 21.6a6.33 6.33 0 0 0 6.33-6.33V8.78a8.18 8.18 0 0 0 4.77 1.53V6.86a4.83 4.83 0 0 1-1-.17Z"/></svg>
  ),
};

function SocialIcon({ platform }: { platform: string }) {
  const key = platform?.toLowerCase().trim();
  return socialIcons[key] || (
    <ExternalLink className="w-4 h-4 text-foreground" />
  );
}

interface SocialLink {
  platform: string;
  url: string;
}

interface Gallery {
  name: string;
  phone: string;
  website: string;
}

export interface ProfileViewData {
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
  id_verified: boolean;
  contact_visibility?: {
    studio_address?: boolean;
    phone?: boolean;
    email?: boolean;
    website?: boolean;
  };
}

export function ProfilePresentationView({ profile }: { profile: ProfileViewData }) {
  const navigate = useNavigate();
  const [startingVerification, setStartingVerification] = useState(false);
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const phoneDisplay = [profile.phone_prefix, profile.phone].filter(Boolean).join(" ");

  const handleVerifyId = async () => {
    setStartingVerification(true);
    try {
      const { data, error } = await supabase.functions.invoke("veriff-session");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        toast.error("Could not start verification session");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to start ID verification");
    } finally {
      setStartingVerification(false);
    }
  };

  return (
    <>
      <header className="pt-12 pb-16 px-6">
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
            GAR-{String(profile.global_artist_id).padStart(8, '0')}
          </span>

          {/* ID Verification status */}
          <div className="mt-6">
            {profile.id_verified ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <ShieldCheck className="w-4 h-4" />
                Identity Verified
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifyId}
                disabled={startingVerification}
                className="gap-1.5"
              >
                {startingVerification ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                {startingVerification ? "Starting…" : "Verify Identity"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 pb-20">
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
                <a href={`mailto:${profile.email}`} className="flex items-center gap-3 p-4 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{profile.email}</span>
                </a>
              )}
              {profile.website && (
                <a
                  href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                  target="_blank" rel="noopener noreferrer"
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

        {profile.social_media_links.length > 0 && (
          <section className="mb-16">
            <div className="flex flex-wrap gap-3 justify-center">
              {profile.social_media_links.map((link, i) => (
                <a
                  key={i}
                  href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-11 h-11 rounded-md border border-border hover:bg-muted transition-colors"
                  title={link.platform || "Link"}
                >
                  <SocialIcon platform={link.platform} />
                </a>
              ))}
            </div>
          </section>
        )}

        {profile.biography && (
          <section className="mb-16">
            <h2 className="text-2xl mb-6">Biography</h2>
            <div className="text-foreground/80 leading-relaxed whitespace-pre-line text-[15px]">
              {profile.biography}
            </div>
          </section>
        )}

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
                      target="_blank" rel="noopener noreferrer"
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

        {profile.chronology && (
          <section className="mb-16">
            <h2 className="text-2xl mb-6">Chronology</h2>
            <div className="text-foreground/80 leading-relaxed whitespace-pre-line text-[15px]">
              {profile.chronology}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
