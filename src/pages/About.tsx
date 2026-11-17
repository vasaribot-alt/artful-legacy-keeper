import PublicHeader from "@/components/PublicHeader";
import PublicGovernanceLink from "@/components/PublicGovernanceLink";
import { governanceDocuments } from "@/lib/governancePublication";
import ArtistFeatureOverview from "@/components/ArtistFeatureOverview";
import PublicPageHero from "@/components/PublicPageHero";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InstagramLink } from "@/components/SocialLinks";
import { ArrowRight, ExternalLink, Shield, Database, Clock, Users, Handshake } from "lucide-react";

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
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "#governance") {
      document.getElementById("governance")?.scrollIntoView({ block: "start" });
    }
  }, [hash]);
  useEffect(() => {
    document.title = "About the Global Artist Registry Foundation";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "An independent non-profit foundation preserving the documentation of contemporary art, artist-authenticated records built for 100 years.",
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <PublicPageHero eyebrow="About the Foundation" title="Preserving the record of contemporary art" description="An independent non-profit foundation preserving the documentation of contemporary art." />

      {/* What we do */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl mb-6">What we do</h2>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              We build and maintain a permanent, archival-grade record of contemporary artworks and the artists who
              make them. Artists, estates, and collectors document their works, including metadata, images, dimensions,
              editions, provenance, exhibitions, catalogues, and professional history, in a system designed for
              accessibility now and preservation over a century. Every account is tied to a verified identity, and
              every work carries a permanent identifier.
            </p>
          </div>
        </div>
      </section>

      <ArtistFeatureOverview />

      {/* Why */}
      <section className="py-16 px-6 border-t border-border bg-surface">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl mb-6">Why it is needed</h2>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              The documentation surrounding art has always been fragile, and today it lives mostly in digital form:
              scattered across gallery systems, private databases, personal websites, and commercial platforms.
              As the art world evolves, galleries change, platforms shift, technology moves on, records can become
              fragmented across systems that were never built to last a century. No widely adopted, independent
              global infrastructure exists to safeguard this continuity for artists, collectors, and researchers alike.
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

      {/* Governance */}
      <section id="governance" className="py-16 px-6 border-t border-border scroll-mt-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl mb-6">Governance</h2>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <h3 className="text-lg text-foreground">Foundation</h3>
            <p>Stichting Global Artist Registry Foundation, known as the Global Artist Registry Foundation (GARF), is a Dutch foundation with its statutory seat in Amsterdam and its contact office in The Hague.</p>
            <p>KvK 42024490 | RSIN 869351412</p>
            <p>Jan Pieterszoon Coenstraat 7, 2595 WP ’s-Gravenhage, Netherlands<br />
              <a href="mailto:contact@globalartistregistry.org" className="break-words underline underline-offset-4">contact@globalartistregistry.org</a>{" | "}
              <a href="tel:+31850600529" className="underline underline-offset-4">+31 850 600 529</a>
            </p>
            <p>GARF preserves documentation of artists and artworks worldwide to safeguard cultural heritage and support verification of authenticity and provenance. Its core registry and archive are free for verified artists.</p>
            <h3 className="pt-5 text-lg text-foreground">Statutory Board</h3>
            <p className="font-medium text-foreground">Jan Sverre Kindem — Chair and Advisory Board Liaison<br />Ingvar Straume — Secretary and Treasurer</p>
            <p>The statutory board sets policy, oversees operations and is responsible for GARF’s accounts and use of its resources.</p>
            <h3 className="pt-5 text-lg text-foreground">Advisory Board</h3>
            <p>The advisory board’s role is to advise on artists, cultural heritage, technology and GARF’s development. It has no executive or spending authority. Its terms of reference are available below.</p>
            <h3 className="pt-5 text-lg text-foreground">Remuneration</h3>
            <p>Statutory board duties are unpaid and no meeting fees are paid. Reasonable documented expenses may be reimbursed under the Board Rules of Procedure. Any separately paid operational work requires a written, independently approved agreement on reasonable terms and sufficient funding.</p>
            <h3 className="pt-5 text-lg text-foreground">Cultural ANBI status</h3>
            <p>GARF is preparing an application for Cultural ANBI status. No ANBI designation has been granted.</p>
            <h3 className="pt-5 text-lg text-foreground">Governance documents</h3>
            <ul className="divide-y divide-border">
              {governanceDocuments.map((item) => (
                <li key={item.number} className="py-4">
                  <a href={`/${item.filename}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 text-foreground underline underline-offset-4">
                    <span>{item.title}</span><ExternalLink className="mt-1 h-4 w-4 shrink-0" />
                  </a>
                  <p className="mt-2 text-sm">Version 1.0, approved 13 November 2026</p>
                  {item.number === "03" && <p className="mt-2 text-sm">Summary of the full internal regulation.</p>}
                </li>
              ))}
            </ul>
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
            <a href="/GARF_Why_GARF_Matters.pdf" target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                Why GARF matters (PDF) <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
            <a href="/GARF_Background_and_Founding_Rationale.pdf" target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                Background and Founding Rationale (PDF) <ExternalLink className="w-4 h-4" />
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
            <div className="mt-2">
              <InstagramLink variant="inline" />
            </div>
          </div>
          <div>
            <div className="font-medium text-foreground mb-2">Registration</div>
            <div>KvK 42024490</div>
            <div>Stichting under Dutch law</div>
            <div className="mt-2">
              <Link to="/terms" className="hover:text-foreground">User Agreement</Link>
            </div>
            <div className="mt-2"><PublicGovernanceLink /></div>
            <div className="mt-2">
              <a
                href="https://catalogueraisonnefoundation.org"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                GARF-CR <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
