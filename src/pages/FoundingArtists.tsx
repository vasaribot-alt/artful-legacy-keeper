import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Award, ArrowRight } from "lucide-react";

interface FoundingArtist {
  user_id: string;
  tier: string;
  joined_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    city: string | null;
    country: string | null;
  };
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

  useEffect(() => {
    const fetchArtists = async () => {
      const { data: foundingData } = await supabase
        .from("founding_artists")
        .select("user_id, tier, joined_at");

      if (foundingData && foundingData.length > 0) {
        const userIds = foundingData.map((f) => f.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, city, country")
          .in("user_id", userIds);

        const merged = foundingData.map((fa) => ({
          ...fa,
          profile: profiles?.find((p) => p.user_id === fa.user_id),
        }));
        setArtists(merged);
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

  return (
    <div className="min-h-screen bg-background">
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

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-2">
          <Award className="h-8 w-8 text-foreground" />
          <h1 className="text-4xl font-semibold tracking-tight">Founding Artists</h1>
        </div>
        <p className="text-muted-foreground text-lg mb-16 max-w-2xl">
          The first artists to join the Global Artist Registry Foundation — pioneers in building a
          permanent, authenticated record of contemporary art.
        </p>

        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : artists.length === 0 ? (
          <p className="text-muted-foreground">The Founding Artist program is currently in progress.</p>
        ) : (
          <div className="space-y-20">
            {groupedByTier.map((group) =>
              group.artists.length > 0 ? (
                <section key={group.tier}>
                  <h2 className="text-xl font-medium mb-1">{group.label}</h2>
                  <p className="text-sm text-muted-foreground mb-8">{group.description}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                    {group.artists.map((artist) => {
                      const initials = artist.profile?.full_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2) || "?";
                      const avatarSrc = artist.profile?.avatar_url
                        ? artist.profile.avatar_url.startsWith("http")
                          ? artist.profile.avatar_url
                          : supabase.storage.from("profile-photos").getPublicUrl(artist.profile.avatar_url).data.publicUrl
                        : undefined;
                      const location = [artist.profile?.city, artist.profile?.country].filter(Boolean).join(", ");

                      return (
                        <Link
                          key={artist.user_id}
                          to={`/artist/${artist.user_id}`}
                          className="text-center group"
                        >
                          <Avatar className="h-24 w-24 mx-auto mb-3 ring-2 ring-transparent group-hover:ring-foreground/20 transition-all">
                            {avatarSrc && <AvatarImage src={avatarSrc} alt={artist.profile?.full_name || ""} />}
                            <AvatarFallback className="text-lg bg-secondary text-secondary-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium text-sm group-hover:text-foreground/80 transition-colors">{artist.profile?.full_name || "Artist"}</p>
                          {location && <p className="text-xs text-muted-foreground mt-0.5">{location}</p>}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ) : null
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default FoundingArtists;
