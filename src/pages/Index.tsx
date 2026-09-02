import GarfLogo from "@/components/GarfLogo";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { InstagramLink } from "@/components/SocialLinks";
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

const audiencePaths = [
  { label: "For artists", to: "/register" },
  { label: "For collectors", to: "/collector-access" },
  { label: "For galleries", to: "/about" },
  { label: "For registrars", to: "/registrars" },
];

const Index = () => {
  const [featuredArtists, setFeaturedArtists] = useState<FeaturedArtist[]>([]);
  const [stats, setStats] = useState<{ artists: number; artworks: number; countries: number } | null>(null);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data: foundingData } = await supabase
        .from("founding_artists")
        .select("user_id");

      if (foundingData && foundingData.length > 0) {
        const userIds = foundingData.map((f) => f.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, city, country")
          .in("user_id", userIds);

        const { count: artworkCount } = await supabase
          .from("artworks")
          .select("id", { count: "exact", head: true })
          .in("owner_id", userIds);

        if (profiles) {
          const withAvatar = profiles.filter((p) => p.avatar_url);
          const ordered = [...withAvatar, ...profiles.filter((p) => !p.avatar_url)];
          setFeaturedArtists(ordered.slice(0, 4));
          setStats({
            artists: foundingData.length,
            artworks: artworkCount ?? 0,
            countries: new Set(profiles.map((p) => p.country).filter(Boolean)).size,
          });
        }
      }
    };
    fetchFeatured();
  }, []);

  const initials = (name: string | null) =>
    (name || "—")
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("");

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <GarfLogo className="h-11" />
          <div className="flex items-center gap-6">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/founding-artists" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Artists
            </Link>

            <Link to="/registrars" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Registrars
            </Link>
            <Link to="/donors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Supporters
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>

            <a
              href="https://catalogueraisonnefoundation.org"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              CR Foundation <ExternalLink className="w-3 h-3" />
            </a>
            <InstagramLink />
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
      <section className="pt-32 pb-20 px-6 animate-in fade-in duration-700">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center gap-12">
          <div className="max-w-3xl space-y-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Archival-Grade Art Database
            </p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-balance">
              The permanent record for art
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A non-profit foundation dedicated to preserving the documentation of art.
              Catalogue raisonné for artists, collection management for collectors, verified
              identity throughout, built to last 100 years.
            </p>
          </div>

          {/* Primary actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Create Your Vault <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/founding-artists">
              <Button variant="outline" size="lg">
                Search the Registry
              </Button>
            </Link>
          </div>

          {/* Proof: registry figures when available, foundation credentials otherwise */}
          <div className="w-full pt-12 border-t border-border flex flex-col items-center">
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 mb-12">
              {(stats
                ? [
                    { value: stats.artists.toLocaleString(), label: "Registered artists" },
                    { value: stats.artworks.toLocaleString(), label: "Documented works" },
                    { value: stats.countries.toLocaleString(), label: "Countries represented" },
                  ]
                : [
                    { value: "100", label: "Year preservation plan" },
                    { value: "KvK 42024490", label: "Stichting under Dutch law" },
                    { value: "Non-profit", label: "No commercial ownership" },
                  ]
              ).map((s) => (
                <div key={s.label} className="text-center">
                  <span className="block text-2xl italic">{s.value}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Proof: verified artists from the registry */}
            {featuredArtists.length > 0 && (
              <div className="w-full">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6 font-semibold">
                  Verified in the Registry
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  {featuredArtists.map((a) => (
                    <Link
                      key={a.user_id}
                      to={`/artist/${a.user_id}`}
                      className="flex items-center gap-3 p-4 border border-border bg-surface hover:border-foreground/30 transition-colors"
                    >
                      <Avatar className="w-10 h-10 shrink-0 grayscale">
                        {a.avatar_url && <AvatarImage src={a.avatar_url} alt={a.full_name || "Artist"} />}
                        <AvatarFallback className="text-[10px]">{initials(a.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="text-left overflow-hidden">
                        <p className="text-xs font-semibold truncate">{a.full_name || "Registered artist"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {[a.city, a.country].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>


          {/* Audience paths */}
          <nav className="flex flex-wrap justify-center gap-6 pt-4">
            {audiencePaths.map((p) => (
              <Link
                key={p.label}
                to={p.to}
                className="text-[11px] uppercase tracking-widest font-medium text-muted-foreground hover:text-foreground border-b border-transparent hover:border-foreground transition-all pb-1"
              >
                {p.label}
              </Link>
            ))}
          </nav>
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

      {/* Registrar Directory Callout */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <Users className="w-6 h-6 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-3xl mb-4">Find a verified registrar</h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto mb-8 leading-relaxed">
            Our directory of Foundation-verified registrars connects artists and collectors
            with professional expertise in catalogue raisonné, provenance research,
            and collections care.
          </p>
          <Link to="/registrars">
            <Button variant="outline" size="lg" className="gap-2">
              Browse the directory <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Partner organisations */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">
            In cooperation with
          </p>
          <h2 className="text-3xl mb-8">Artist organisations</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-16">
            <a
              href="/garf-logo.png"
              download="GARF_Logo.png"
              className="block rounded-md p-3 transition-opacity hover:opacity-70"
              aria-label="Download the GARF logo"
            >
              <img
                src="/garf-logo.png"
                alt="Global Artist Registry Foundation logo"
                className="h-20 w-auto object-contain mx-auto"
              />
            </a>
            <div className="h-px w-12 bg-border sm:h-16 sm:w-px" aria-hidden="true" />
            <a
              href="https://www.iaa-usa.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md p-3 transition-opacity hover:opacity-70"
              aria-label="Visit IAA/USA"
            >
              <img
                src="/iaa-usa-logo.webp"
                alt="IAA/USA, International Association of Art, United States National Committee"
                className="h-20 w-auto max-w-[220px] object-contain mx-auto"
                loading="lazy"
              />
            </a>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mt-8 leading-relaxed">
            The Global Artist Registry Foundation and IAA/USA share a commitment to supporting artists
            and preserving their records for future generations. The GARF logo is available for our partners.
          </p>
          <div className="mt-6">
            <a href="/garf-logo.png" download="GARF_Logo.png">
              <Button variant="outline" size="sm" className="gap-2">
                Download GARF logo <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </a>
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
              platforms. As galleries, platforms, and databases evolve or change hands over time,
              the documentation surrounding artworks can become scattered or harder to trace.
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
            <div className="mt-2">
              <InstagramLink variant="inline" />
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
