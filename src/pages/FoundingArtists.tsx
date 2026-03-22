import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Award, ArrowRight, Shield, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FoundingArtist {
  user_id: string;
  tier: string;
  joined_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    city: string | null;
    country: string | null;
    biography: string | null;
  };
  artworkCount?: number;
  featuredImage?: string | null;
}

const tierLabels: Record<string, { label: string; description: string }> = {
  internationally_established: {
    label: "Internationally Established",
    description: "Artists with significant international recognition and exhibition history.",
  },
  mid_career: {
    label: "Mid-Career",
    description: "Artists building a strong body of work and growing presence.",
  },
  emerging: {
    label: "Emerging & Global Voices",
    description: "Artists at the forefront of new perspectives and cultural narratives.",
  },
};

const tierOrder = ["internationally_established", "mid_career", "emerging"];

const FoundingArtists = () => {
  const [artists, setArtists] = useState<FoundingArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showcaseArtists, setShowcaseArtists] = useState<FoundingArtist[]>([]);

  useEffect(() => {
    const fetchArtists = async () => {
      const { data: foundingData } = await supabase
        .from("founding_artists")
        .select("user_id, tier, joined_at");

      if (foundingData && foundingData.length > 0) {
        const userIds = foundingData.map((f) => f.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, city, country, biography")
          .in("user_id", userIds);

        // Fetch artwork counts and a featured image per artist
        const { data: artworks } = await supabase
          .from("artworks")
          .select("owner_id, id, image_url")
          .in("owner_id", userIds);

        const artworksByOwner = new Map<string, { count: number; image: string | null }>();
        artworks?.forEach((a) => {
          const existing = artworksByOwner.get(a.owner_id);
          if (existing) {
            existing.count++;
          } else {
            artworksByOwner.set(a.owner_id, { count: 1, image: a.image_url });
          }
        });

        const merged = foundingData.map((fa) => ({
          ...fa,
          profile: profiles?.find((p) => p.user_id === fa.user_id),
          artworkCount: artworksByOwner.get(fa.user_id)?.count || 0,
          featuredImage: artworksByOwner.get(fa.user_id)?.image || null,
        }));

        setArtists(merged);

        // Pick two showcase artists: prefer those with avatars and bios
        const withContent = merged
          .filter((a) => a.profile?.avatar_url && a.profile?.biography)
          .slice(0, 2);
        const fallback = withContent.length < 2
          ? merged.filter((a) => !withContent.includes(a)).slice(0, 2 - withContent.length)
          : [];
        setShowcaseArtists([...withContent, ...fallback]);
      }
      setLoading(false);
    };
    fetchArtists();
  }, []);

  const groupedByTier = tierOrder.map((tier) => ({
    tier,
    ...tierLabels[tier],
    artists: artists.filter((a) => a.tier === tier),
  }));

  const getAvatarSrc = (avatarUrl: string | null | undefined) => {
    if (!avatarUrl) return undefined;
    return avatarUrl.startsWith("http")
      ? avatarUrl
      : supabase.storage.from("profile-photos").getPublicUrl(avatarUrl).data.publicUrl;
  };

  const getInitials = (name: string | null | undefined) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || "?";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Global Artist Registry Foundation
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero / Mission */}
      <section className="py-20 px-6 border-b border-border">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Award className="h-6 w-6 text-foreground" />
            <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Founding Artist Program</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-6 text-balance">
            The artists building art's permanent record
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            For the first time, artists can create their own authenticated, archival-grade catalogue raisonné — 
            a permanent record that outlasts galleries, institutions, and markets. Founding Artists are the 
            pioneers who believe their work deserves a record as enduring as the art itself.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Verified identity
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> 100-year preservation
            </span>
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Artist-controlled
            </span>
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <section className="py-16 px-6 border-b border-border bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-8 text-center">Why this matters</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Your legacy, your terms",
                text: "No gallery, estate, or institution should control the definitive record of your life's work. This is yours.",
              },
              {
                title: "Authenticated forever",
                text: "Government-verified identity tied to every entry. No disputes, no forgeries, no ambiguity — for 100 years and beyond.",
              },
              {
                title: "First movers shape history",
                text: "Founding Artists are permanently recognized as the pioneers who established this new standard for art documentation.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="font-medium mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {loading ? (
          <div className="text-muted-foreground text-center py-12">Loading...</div>
        ) : artists.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            The Founding Artist program is currently in progress.
          </p>
        ) : (
          <>
            {/* Two Artist Showcases */}
            {showcaseArtists.length > 0 && (
              <section className="mb-20">
                <h2 className="text-2xl font-semibold mb-8">Featured Founding Artists</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  {showcaseArtists.map((artist) => {
                    const avatarSrc = getAvatarSrc(artist.profile?.avatar_url);
                    const location = [artist.profile?.city, artist.profile?.country]
                      .filter(Boolean)
                      .join(", ");
                    const bio = artist.profile?.biography;
                    const truncatedBio = bio && bio.length > 200 ? bio.slice(0, 200) + "…" : bio;

                    return (
                      <Link
                        key={artist.user_id}
                        to={`/artist/${artist.user_id}`}
                        className="group border border-border rounded-lg p-6 hover:border-foreground/20 transition-colors"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar className="h-16 w-16 shrink-0 ring-2 ring-transparent group-hover:ring-foreground/10 transition-all">
                            {avatarSrc && (
                              <AvatarImage src={avatarSrc} alt={artist.profile?.full_name || ""} />
                            )}
                            <AvatarFallback className="text-lg bg-secondary text-secondary-foreground">
                              {getInitials(artist.profile?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-lg group-hover:text-foreground/80 transition-colors">
                              {artist.profile?.full_name || "Artist"}
                            </p>
                            {location && (
                              <p className="text-sm text-muted-foreground">{location}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {tierLabels[artist.tier]?.label} · {artist.artworkCount} work{artist.artworkCount !== 1 ? "s" : ""} registered
                            </p>
                          </div>
                        </div>
                        {truncatedBio && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {truncatedBio}
                          </p>
                        )}
                        <span className="inline-flex items-center gap-1 text-sm mt-4 text-muted-foreground group-hover:text-foreground transition-colors">
                          View profile <ArrowRight className="w-3 h-3" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Full Directory by Tier */}
            <div className="space-y-16">
              {groupedByTier.map((group) =>
                group.artists.length > 0 ? (
                  <section key={group.tier}>
                    <h2 className="text-xl font-medium mb-1">{group.label}</h2>
                    <p className="text-sm text-muted-foreground mb-8">{group.description}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                      {group.artists.map((artist) => {
                        const avatarSrc = getAvatarSrc(artist.profile?.avatar_url);
                        const location = [artist.profile?.city, artist.profile?.country]
                          .filter(Boolean)
                          .join(", ");

                        return (
                          <Link
                            key={artist.user_id}
                            to={`/artist/${artist.user_id}`}
                            className="text-center group"
                          >
                            <Avatar className="h-24 w-24 mx-auto mb-3 ring-2 ring-transparent group-hover:ring-foreground/20 transition-all">
                              {avatarSrc && (
                                <AvatarImage src={avatarSrc} alt={artist.profile?.full_name || ""} />
                              )}
                              <AvatarFallback className="text-lg bg-secondary text-secondary-foreground">
                                {getInitials(artist.profile?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-sm group-hover:text-foreground/80 transition-colors">
                              {artist.profile?.full_name || "Artist"}
                            </p>
                            {location && (
                              <p className="text-xs text-muted-foreground mt-0.5">{location}</p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ) : null
              )}
            </div>
          </>
        )}
      </main>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-border text-center">
        <h2 className="text-2xl font-semibold mb-3">Join the Founding Artists</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
          The program is invitation-only. If you've received an invite code, 
          register now to secure your place in art history.
        </p>
        <Link to="/register">
          <Button size="lg" className="gap-2">
            Register with Invite Code <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 Global Artist Registry Foundation</span>
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        </div>
      </footer>
    </div>
  );
};

export default FoundingArtists;
