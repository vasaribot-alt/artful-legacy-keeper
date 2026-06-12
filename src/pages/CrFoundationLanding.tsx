import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, ScrollText, Users, ShieldCheck, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

const pillars = [
  {
    icon: BookOpen,
    title: "Scholarly Catalogues Raisonnés",
    description:
      "A permanent home for catalogue raisonné projects — in preparation, published, or online — with structured metadata, scope statements, and ISBN references.",
  },
  {
    icon: Users,
    title: "Author & Committee",
    description:
      "Every catalogue lists its author, chair, and committee members, with affiliations. Authorship and provenance of scholarship are visible and citable.",
  },
  {
    icon: ScrollText,
    title: "Authentication Submissions",
    description:
      "Owners submit works for committee review through a structured workflow. Quorum-based voting, rejection reasons, and an append-only audit trail.",
  },
  {
    icon: ShieldCheck,
    title: "100-Year Preservation",
    description:
      "Catalogues raisonnés are scholarly records meant to outlast their authors. Built on archival-grade infrastructure for long-term digital preservation.",
  },
];

const CrFoundationLanding = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Catalogue Raisonné Foundation</span>
          <div className="flex items-center gap-6">
            <Link to="/cr" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Directory
            </Link>
            <a
              href="https://globalartistregistry.org"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Global Artist Registry <ExternalLink className="w-3 h-3" />
            </a>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link to="/cr">
              <Button size="sm">Browse Directory</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Scholarly Record of Artists' Œuvres
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 text-balance font-serif">
            The Catalogue Raisonné Foundation
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            An international directory of catalogues raisonnés. Scholarly entries, committee structures,
            and a transparent process for authentication submissions.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/cr">
              <Button size="lg" className="gap-2">
                Browse Directory <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/cr/profile">
              <Button variant="outline" size="lg">
                Editor Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {pillars.map((p) => (
              <div key={p.title}>
                <p.icon className="w-5 h-5 text-muted-foreground mb-4" />
                <h3 className="text-xl mb-2">{p.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-surface border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl mb-12 text-center font-serif">How a catalogue raisonné works here</h2>
          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Artist or estate is listed",
                desc: "A scholarly entry is created for the artist, with biographical period, nationality, and CR status.",
              },
              {
                step: "02",
                title: "Author and committee are named",
                desc: "The catalogue's author, chair, and committee members are recorded, with affiliations.",
              },
              {
                step: "03",
                title: "Owners submit works",
                desc: "Collectors submit works for committee review through a structured authentication workflow.",
              },
              {
                step: "04",
                title: "Committee votes",
                desc: "Quorum-based voting with documented rejection reasons and an append-only audit log.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <span className="text-sm text-muted-foreground font-mono mt-1 shrink-0">{item.step}</span>
                <div>
                  <h4 className="text-lg mb-1 font-medium">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sister organisation */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">A Sister Initiative</p>
          <h2 className="text-3xl mb-4 font-serif">Global Artist Registry Foundation</h2>
          <p className="text-muted-foreground leading-relaxed mb-6 max-w-xl mx-auto">
            The Catalogue Raisonné Foundation works alongside the Global Artist Registry Foundation —
            providing verified artist identity, collection management, and a 100-year preservation plan
            for primary archival records.
          </p>
          <a
            href="https://globalartistregistry.org"
            className="inline-flex items-center gap-2 text-sm underline underline-offset-4 hover:text-foreground text-muted-foreground"
          >
            Visit globalartistregistry.org <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl mb-8 font-serif">Built for scholarship</h2>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {[
              "Author & committee attribution",
              "Quorum-based voting",
              "Append-only audit log",
              "Public scholarly directory",
              "Structured submission workflow",
              "Long-term digital preservation",
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
          <h2 className="text-3xl mb-8 text-center font-serif">About the Foundation</h2>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              The Catalogue Raisonné Foundation operates under the Global Artist Registry Foundation
              (GARF), an independent, non-profit foundation dedicated to the long-term preservation
              of contemporary artistic documentation.
            </p>
            <p>
              GARF is independent in governance and purpose: not owned or controlled by commercial
              interests and established solely to serve this cultural mission. The foundation
              provides a long-term digital infrastructure through which artists, scholars, and
              committees can compile, review, and publish authoritative catalogues raisonnés—
              creating a durable, globally accessible scholarly record of contemporary artistic
              production.
            </p>
            <p>
              Through artist-authenticated documentation, structured committee review, and
              long-term preservation strategies, the foundation aims to make the scholarly record
              of contemporary art accessible across generations—available to institutions,
              researchers, collectors, and the public.
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
          <span>© 2026 Catalogue Raisonné Foundation</span>
          <span>Scholarly record of artists' œuvres</span>
        </div>
      </footer>
    </div>
  );
};

export default CrFoundationLanding;
