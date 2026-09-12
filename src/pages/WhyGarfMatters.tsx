import GarfLogo from "@/components/GarfLogo";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InstagramLink } from "@/components/SocialLinks";
import { Download, ArrowRight, Shield, Users, Database, Clock, Handshake } from "lucide-react";

const principles = [
  { icon: Shield, title: "Owned by the artist", description: "The artist authenticates and controls their own record." },
  { icon: Handshake, title: "Held independently", description: "A non-profit stichting with no commercial owners." },
  { icon: Clock, title: "Built for 100 years", description: "Redundant archival storage and open, structured metadata." },
];

const steps = [
  { n: "01", title: "Verify", description: "Every account is tied to a verified identity, so the record has an author." },
  { n: "02", title: "Document", description: "Works, dimensions, editions, provenance, exhibitions, catalogues and CV in one structure." },
  { n: "03", title: "Authenticate", description: "The artist confirms each record. Registrars and galleries propose, artists approve." },
  { n: "04", title: "Preserve", description: "Permanent identifiers, archival storage, and open exports institutions can rely on." },
];

const consequences = [
  { n: "01", title: "Rented", description: "The record sits on commercial platforms with no obligation to keep it." },
  { n: "02", title: "Scattered", description: "Images here, dimensions there, provenance in an inbox." },
  { n: "03", title: "Undocumented", description: "No permanent identifier, so the same work appears as several works." },
];

const whoPays = [
  { title: "Artists", description: "A career becomes unprovable. Early work vanishes first." },
  { title: "Estates", description: "Heirs inherit boxes and passwords, not an archive." },
  { title: "Collectors", description: "Provenance gaps that cannot be closed after the fact." },
  { title: "Scholars", description: "Catalogues raisonnés built on guesswork instead of evidence." },
];

const uses = [
  "Permanent identifier for every work",
  "Catalogue with images and full metadata",
  "Provenance and location history",
  "Public artist page and private portfolios",
  "Exhibition history and living CV",
  "Archival cloud storage",
  "Structured exports for galleries and museums",
  "Correspondence and document archive",
  "Approval rights over records added by others",
];

const governance = [
  { title: "Dutch stichting", description: "Registered under Dutch law in The Hague. No shareholders, no distribution of profit." },
  { title: "Independent board", description: "Art-historical, legal and archival expertise. No single party holds controlling rights." },
  { title: "Public statutes and reporting", description: "Articles of association, non-distribution constraint and dissolution clauses are public." },
  { title: "Free for verified artists", description: "Funded by donations, supporting members, partnerships and grants. We do not sell art." },
];

const WhyGarfMatters = () => {
  useEffect(() => {
    document.title = "Why GARF Matters — Global Artist Registry Foundation";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "Art documentation is disappearing. The Global Artist Registry Foundation is an independent Dutch stichting building a permanent, artist-authenticated archive for 100 years.",
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <GarfLogo className="h-20" />
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/founding-artists" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Artists
            </Link>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
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
      <header className="pt-36 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">Problem & Solution</p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-6 text-balance">
            Art documentation is disappearing.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            The Global Artist Registry Foundation exists to stop that. An independent Dutch
            stichting with a 100-year preservation plan.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <a href="/GARF_Why_GARF_Matters.pdf" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download the one-pager (PDF)
              </Button>
            </a>
            <Link to="/donate">
              <Button>
                Support the Foundation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* What changed */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">What changed</p>
            <h2 className="font-serif text-2xl md:text-3xl mb-4">From paper to rented space</h2>
            <p className="text-muted-foreground leading-relaxed">
              In forty years, the record of art moved from paper, office servers and single
              workstations to gallery software, cloud drives, websites and inboxes. The medium
              changed. The responsibility for the record never moved with it.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">The upside</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>Access from anywhere</li>
                <li>Instant collaboration</li>
                <li>No local hardware</li>
                <li>Continuous updates</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">The same list, flipped</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>Until the account lapses</li>
                <li>Held on infrastructure the artist does not own</li>
                <li>And no local copy either</li>
                <li>Including the update that removes the export you needed</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Consequence */}
      <section className="py-16 px-6 border-t border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4 text-center">Consequence</p>
          <h2 className="font-serif text-2xl md:text-3xl mb-10 text-center max-w-2xl mx-auto">
            The cultural record of our time is rented, scattered and undocumented.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {consequences.map((c) => (
              <div key={c.n} className="border border-border rounded-lg p-6 bg-background">
                <p className="text-xs font-mono text-muted-foreground mb-3">{c.n}</p>
                <h3 className="font-serif text-xl mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who carries the loss */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4 text-center">Who carries the loss</p>
          <h2 className="font-serif text-2xl md:text-3xl mb-10 text-center">When the record goes, four people pay for it.</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {whoPays.map((w) => (
              <div key={w.title} className="text-center">
                <h3 className="font-serif text-lg mb-2">{w.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The gap */}
      <section className="py-16 px-6 border-t border-border bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">The gap</p>
          <h2 className="font-serif text-2xl md:text-3xl mb-6">
            There is no independent institution whose only job is to keep the record.
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Software companies serve customers, and are sold, pivoted or closed. Galleries document
            what they sell, for as long as they represent the artist. Museums document their own
            collections, not the artists' full output.
          </p>
          <p className="text-lg font-serif">
            Libraries have this institution. Music has it. Film has it. Contemporary art does not.
          </p>
        </div>
      </section>

      {/* The solution */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4 text-center">The solution</p>
          <h2 className="font-serif text-2xl md:text-3xl mb-10 text-center max-w-2xl mx-auto">
            A permanent, artist-authenticated archive, held by a foundation that cannot be sold.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {principles.map((p) => (
              <div key={p.title} className="border border-border rounded-lg p-6 text-center">
                <p.icon className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-serif text-lg mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 border-t border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4 text-center">How it works</p>
          <h2 className="font-serif text-2xl md:text-3xl mb-10 text-center">From scattered files to a permanent record.</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="border border-border rounded-lg p-6 bg-background">
                <p className="text-xs font-mono text-muted-foreground mb-3">STEP {s.n}</p>
                <h3 className="font-serif text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Governance */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4 text-center">Governance, not a company</p>
          <h2 className="font-serif text-2xl md:text-3xl mb-10 text-center">Structured to outlast its founders.</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {governance.map((g) => (
              <div key={g.title} className="border border-border rounded-lg p-6">
                <h3 className="font-serif text-lg mb-2">{g.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{g.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* In practice */}
      <section className="py-16 px-6 border-t border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4 text-center">In practice</p>
          <h2 className="font-serif text-2xl md:text-3xl mb-10 text-center">One record, many uses.</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uses.map((u, i) => (
              <div key={u} className="flex items-start gap-3 border border-border rounded-lg p-4 bg-background">
                <span className="text-xs font-mono text-muted-foreground mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-sm">{u}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The ask */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">The ask</p>
          <h2 className="font-serif text-3xl md:text-4xl mb-6 text-balance">
            The record of this generation is still recoverable. It will not be in twenty years.
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto">
            We are building the infrastructure now, while the artists are here to authenticate their
            own work.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            <div className="border border-border rounded-lg p-6">
              <h3 className="font-serif text-lg mb-2">Support</h3>
              <p className="text-sm text-muted-foreground">Fund the first decade and the endowment.</p>
            </div>
            <div className="border border-border rounded-lg p-6">
              <h3 className="font-serif text-lg mb-2">Partner</h3>
              <p className="text-sm text-muted-foreground">Museums, archives, universities, registrars, artist organisations.</p>
            </div>
            <div className="border border-border rounded-lg p-6">
              <h3 className="font-serif text-lg mb-2">Refer</h3>
              <p className="text-sm text-muted-foreground">Introduce the artists and estates who need this most.</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/donate">
              <Button>
                Support the Foundation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/statement-of-support">
              <Button variant="outline">Sign the Statement of Support</Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline">Talk to us</Button>
            </Link>
          </div>
          <p className="mt-10 text-xs text-muted-foreground font-mono">
            globalartistregistry.org · contact@globalartistregistry.org · KVK 42024490
          </p>
        </div>
      </section>
    </div>
  );
};

export default WhyGarfMatters;
