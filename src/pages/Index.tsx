import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Shield, Database, Users, Clock, ArrowRight, CheckCircle2, ExternalLink, PlayCircle } from "lucide-react";

const tutorials = [
  { src: "/tutorials/how-to-profile-mac-safe.mp4", title: "Build your profile." },
  { src: "/tutorials/how-to-bulk-mac-safe.mp4", title: "Import your entire catalogue." },
  { src: "/tutorials/how-to-capture-mac-safe.mp4", title: "Capture, from the studio." },
  { src: "/tutorials/how-to-exhibition-mac-safe.mp4", title: "Document the exhibition." },
  { src: "/tutorials/how-to-catalogues-mac-safe.mp4", title: "Build the publication record." },
];

const features = [
  {
    icon: Database,
    title: "Catalogue Raisonné",
    description: "Build a definitive, archival-grade record of an artist's complete body of work. Structured metadata, provenance tracking, and exhibition history.",
  },
  {
    icon: Users,
    title: "Collection Management",
    description: "Collectors manage their holdings with full provenance, condition reports, and loan tracking. Grant registrar access for professional cataloguing.",
  },
  {
    icon: Shield,
    title: "Verified Identity",
    description: "Every artist and collector undergoes government-approved ID verification. Ensuring authenticity and trust in every database entry.",
  },
  {
    icon: Clock,
    title: "100-Year Preservation",
    description: "Data integrity guaranteed across generations. Redundant archival storage, immutable records, and long-term digital preservation standards.",
  },
];

interface FeaturedArtist {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
}

const Index = () => {
  const [featuredArtists, setFeaturedArtists] = useState<FeaturedArtist[]>([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data: foundingData } = await supabase
        .from("founding_artists")
        .select("user_id")
        .limit(8);

      if (foundingData && foundingData.length > 0) {
        const userIds = foundingData.map((f) => f.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, city, country")
          .in("user_id", userIds);

        if (profiles) {
          setFeaturedArtists(profiles);
        }
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Global Artist Registry Foundation</span>
          <div className="flex items-center gap-6">
            <Link to="/donors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Supporters
            </Link>
            <a
              href="https://catalogueraisonnefoundation.org"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              CR Foundation <ExternalLink className="w-3 h-3" />
            </a>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Archival-Grade Art Database
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 text-balance">
            The permanent record for art
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Catalogue raisonné for artists. Collection management for collectors. 
            Verified identity. Built to last 100 years.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Create Your Vault <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {features.map((feature) => (
              <div key={feature.title} className="group">
                <feature.icon className="w-5 h-5 text-muted-foreground mb-4" />
                <h3 className="text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founding Artists */}
      {featuredArtists.length > 0 && (
        <section className="py-20 px-6 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl mb-2">Founding Artists</h2>
                <p className="text-muted-foreground text-sm">
                  Pioneers building a permanent, authenticated record of contemporary art.
                </p>
              </div>
              <Link
                to="/founding-artists"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors shrink-0"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {featuredArtists.slice(0, 8).map((artist) => {
                const avatarSrc = artist.avatar_url
                  ? artist.avatar_url.startsWith("http")
                    ? artist.avatar_url
                    : supabase.storage.from("profile-photos").getPublicUrl(artist.avatar_url).data.publicUrl
                  : undefined;
                const location = [artist.city, artist.country].filter(Boolean).join(", ");
                return (
                  <Link
                    key={artist.user_id}
                    to={`/artist/${artist.user_id}`}
                    className="text-center group"
                  >
                    <Avatar className="h-20 w-20 mx-auto mb-3 ring-2 ring-transparent group-hover:ring-foreground/20 transition-all">
                      {avatarSrc && <AvatarImage src={avatarSrc} alt={artist.full_name || ""} />}
                      <AvatarFallback className="text-lg bg-secondary text-secondary-foreground">
                        {artist.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium text-sm">{artist.full_name || "Artist"}</p>
                    {location && <p className="text-xs text-muted-foreground mt-0.5">{location}</p>}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 px-6 bg-surface border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl mb-12 text-center">How it works</h2>
          <div className="space-y-8">
            {[
              { step: "01", title: "Verify your identity", desc: "Complete government-approved ID verification to establish your authenticated presence." },
              { step: "02", title: "Create your database", desc: "Artists build their catalogue raisonné. Collectors create their collection inventory." },
              { step: "03", title: "Invite registrars", desc: "Grant access to professional registrars who help catalogue and document artworks." },
              { step: "04", title: "Preserve for generations", desc: "Your data is archived with 100-year preservation standards. Immutable and permanent." },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <span className="text-sm text-muted-foreground font-mono mt-1 shrink-0">{item.step}</span>
                <div>
                  <h4 className="text-lg mb-1 font-sans font-medium">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tutorials */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3 inline-flex items-center gap-2">
              <PlayCircle className="w-4 h-4" /> Tutorials
            </p>
            <h2 className="text-3xl mb-3">See how it works</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Short walkthroughs covering the core workflows in the Registry.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {tutorials.map((t) => (
              <div key={t.src} className="group">
                <div className="aspect-video bg-secondary rounded-md overflow-hidden mb-4 ring-1 ring-border">
                  <video
                    src={t.src}
                    controls
                    preload="metadata"
                    playsInline
                    className="w-full h-full object-contain bg-background"
                  />
                </div>
                <h4 className="text-base font-medium">{t.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl mb-8">Built for permanence</h2>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {[
              "Government ID verification",
              "Immutable audit trails",
              "Redundant archival storage",
              "Open metadata standards",
              "Provenance chain tracking",
              "Condition report management",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl mb-8 text-center">About the Foundation</h2>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              The Global Artist Registry Foundation (GARF) is an independent non-profit foundation
              dedicated to preserving the documentation of contemporary artistic practice for future generations.
            </p>
            <p>
              Throughout history, artists have created works that shape how societies understand
              themselves and their time. Yet the documentation surrounding artistic creation, including images,
              records, catalogues, exhibition history, and personal archives, has often been
              fragile and easily lost. Today this documentation increasingly exists in digital form,
              dispersed across private databases, gallery systems, personal websites, and commercial
              platforms. When galleries close, services disappear, or artists lose access to
              platforms, the documentation surrounding artworks can vanish with them.
            </p>
            <p>
              GARF was established to address this challenge. Independent in both governance and purpose,
              the foundation operates without commercial ownership or influence and is dedicated
              exclusively to this cultural mission. Its goal is to build a durable digital infrastructure
              that enables artists to document and authenticate their work, exhibitions, and professional
              histories, creating a trusted and accessible record of contemporary artistic production.
            </p>
            <p>
              At the center of this effort is the belief that artists should have the ability not
              only to preserve the record of their own work, but also to contribute directly to the
              cultural memory of their time.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-3 text-sm text-muted-foreground">
          <div>
            <div className="font-medium text-foreground mb-2">Global Artist Registry Foundation</div>
            <div>Jan Pieterszoon Coenstraat 7</div>
            <div>2595 WP 's-Gravenhage</div>
            <div>The Hague, Netherlands</div>
          </div>
          <div>
            <div className="font-medium text-foreground mb-2">Contact</div>
            <div>
              <a href="mailto:contact@globalartistregistry.org" className="hover:text-foreground">
                contact@globalartistregistry.org
              </a>
            </div>
            <div>
              <a href="tel:+31850600529" className="hover:text-foreground">+31 850 600 529</a>
            </div>
          </div>
          <div>
            <div className="font-medium text-foreground mb-2">Registration</div>
            <div>KvK 42024490</div>
            <div>Stichting under Dutch law</div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© 2026 Global Artist Registry Foundation</span>
          <span>Archival-grade art documentation</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
