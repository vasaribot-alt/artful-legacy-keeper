import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Globe, Phone, Mail, MapPin, ExternalLink, Building2,
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
}

export function ProfilePresentationView({ profile }: { profile: ProfileViewData }) {
  const navigate = useNavigate();
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const phoneDisplay = [profile.phone_prefix, profile.phone].filter(Boolean).join(" ");

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
            ID {profile.global_artist_id}
          </span>
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
            <div className="flex flex-wrap gap-2 justify-center">
              {profile.social_media_links.map((link, i) => (
                <a
                  key={i}
                  href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm hover:bg-muted transition-colors"
                >
                  {link.platform || "Link"}
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
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
