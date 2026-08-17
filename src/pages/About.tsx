import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InstagramLink } from "@/components/SocialLinks";
import { ArrowRight, ExternalLink, Shield, Database, Clock, Users, Download, Handshake } from "lucide-react";

const principles = [
  {
    icon: Shield,
    title: "Independent",
    description:
      "No commercial ownership or influence; a single cultural mission.",
  },
  {
    icon: Users,
    title: "Artist-authenticated",
    description:
      "Artists confirm the record of their own work and history.",
  },
  {
    icon: Database,
    title: "Open and structured",
    description:
      "Consistent metadata and exports institutions can rely on.",
  },
  {
    icon: Clock,
    title: "Built for 100 years",
    description:
      "Redundant archival storage and long-term preservation standards.",
  },
  {
    icon: Handshake,
    title: "Collaborative",
    description:
      "Open to museums, archives, galleries, registrars, universities, and foundations.",
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
            <InstagramLink />
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
            An independent non-profit foundation preserving the documentation of contemporary art.
          </p>
        </div>
      </header>

      {/* What we do */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl mb-6">What we do</h2>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              We build and maintain a permanent, archival-grade record of contemporary artworks and the artists who
              make them. Artists, estates, and collectors document their works — metadata, images, dimensions,
              editions, provenance, exhibitions, catalogues, and professional history — in a system designed for
              accessibility now and preservation over a century. Every account is tied to a verified identity, and
              every work carries a permanent identifier.
            </p>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="py-16 px-6 border-t border-border bg-surface">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl mb-6">Why it is needed</h2>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              The documentation surrounding art has always been fragile, and today it lives mostly in digital form:
              scattered across gallery systems, private databases, personal websites, and commercial platforms. When
              galleries close, services shut down, or artists lose access, the record disappears with them — leaving
              artists without continuity, collectors without provenance, and researchers with gaps in the cultural
              record. No widely adopted, independent global infrastructure exists to prevent this.
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
              The Global Artist Registry Foundation (GARF) is a stichting registered under Dutch law in The Hague,
              governed by a board and advised by professionals in collections management, art history, and archival
              practice. It has no commercial owners and is funded by donations, supporting members, institutional
              partnerships, and grants.
            </p>
          </div>

          <h2 className="text-2xl mt-14 mb-6">Working with us</h2>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              Artists and estates can create an archive. Collectors can manage and document holdings. Registrars can
              join a vetted public directory. Institutions and funders can partner with the foundation or support its
              endowment for long-term preservation.
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
