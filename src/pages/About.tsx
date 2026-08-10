import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink, Shield, Database, Clock, Users } from "lucide-react";

const principles = [
  {
    icon: Shield,
    title: "Independent",
    description:
      "A Dutch stichting with no commercial ownership or influence, established solely for this cultural mission.",
  },
  {
    icon: Users,
    title: "Artist-authenticated",
    description:
      "Artists document and confirm the record of their own work, exhibitions, and professional history.",
  },
  {
    icon: Database,
    title: "Open and structured",
    description:
      "Consistent metadata, provenance, and exhibition history that institutions and researchers can rely on.",
  },
  {
    icon: Clock,
    title: "Built for 100 years",
    description:
      "Redundant archival storage and long-term preservation strategies, designed to outlast any single platform.",
  },
];

const About = () => {
  useEffect(() => {
    document.title = "About the Global Artist Registry Foundation";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "An independent non-profit foundation preserving the documentation of contemporary art — artist-authenticated records built for 100 years.",
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Global Artist Registry Foundation
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/founding-artists" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Artists
            </Link>
            <Link to="/registrars" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Registrars
            </Link>
            <Link to="/donors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Supporters
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">About the Foundation</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-6 text-balance">
            Preserving the record of contemporary art
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            The Global Artist Registry Foundation is an independent, non-profit foundation building durable
            infrastructure for the documentation of artists and their work — authenticated by the artists
            themselves and designed to remain accessible for generations.
          </p>
        </div>
      </header>

      {/* What we do */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl mb-6">What we do</h2>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              Artists, estates, and collectors use the registry to build an archival-grade record of artworks:
              structured metadata, images, dimensions, editions, provenance, exhibition history, catalogues, and
              professional CVs. Every account is tied to a verified identity, and every artwork receives a
              permanent identifier.
            </p>
            <p>
              Around this core we maintain a public registry of artists, a directory of verified professional
              registrars who can assist with cataloguing, and a scholarly framework for catalogues raisonnés
              through our sister initiative, the Catalogue Raisonné Foundation.
            </p>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="py-16 px-6 border-t border-border bg-surface">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl mb-6">Why it matters</h2>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              The documentation surrounding artistic creation — images, records, catalogues, exhibition histories,
              and personal archives — has always been fragile. In earlier centuries it survived, imperfectly, in
              libraries, museums, and institutional archives.
            </p>
            <p>
              Today it exists mostly in digital form, dispersed across private databases, gallery systems, personal
              websites, and commercial platforms. These systems are accessible in the present but unstable over
              time. When galleries close, services shut down, or artists lose access to a platform, the record can
              disappear with it.
            </p>
            <p>
              What is lost is not only information about individual works. Entire histories of artistic production
              become fragmented. For artists, this breaks the continuity of their practice. For collectors, it
              creates uncertainty around provenance and authenticity. For researchers and historians, it leaves
              gaps in the cultural record of our time. No widely adopted, independent global infrastructure exists
              to prevent this — which is why the foundation was established.
            </p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl mb-10">How we work</h2>
          <div className="grid md:grid-cols-2 gap-10">
            {principles.map((p) => (
              <div key={p.title}>
                <p.icon className="w-5 h-5 text-muted-foreground mb-4" />
                <h3 className="text-lg mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who we are */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl mb-6">Who we are</h2>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              GARF is a stichting (foundation) registered under Dutch law in The Hague, the Netherlands, governed
              by a board and advised by professionals from the fields of collections management, art history, and
              archival practice. The foundation has no commercial owners; its work is funded by donations,
              supporting members, and institutional partners.
            </p>
            <p>
              Preserving artistic documentation is a shared responsibility. Museums, archives, galleries,
              collectors, registrars, and researchers all depend on reliable records of artistic production — and
              the foundation is built as a collaborative framework, open to institutional partnership.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 mt-10">
            <a href="/GARF_Background_and_Founding_Rationale.pdf" download>
              <Button className="gap-2">
                Background and Founding Rationale (PDF) <Download className="w-4 h-4" />
              </Button>
            </a>
            <Link to="/donate">
              <Button variant="outline" className="gap-2">
                Support the foundation <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="mailto:contact@globalartistregistry.org">
              <Button variant="outline">Contact us</Button>
            </a>
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
              <a href="tel:+31850600529" className="hover:text-foreground">
                +31 850 600 529
              </a>
            </div>
          </div>
          <div>
            <div className="font-medium text-foreground mb-2">Registration</div>
            <div>KvK 42024490</div>
            <div>Stichting under Dutch law</div>
            <div className="mt-2">
              <a
                href="https://catalogueraisonnefoundation.org"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                CR Foundation <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
