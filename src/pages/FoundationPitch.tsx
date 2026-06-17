import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  Globe2,
  Landmark,
  Users2,
  ShieldCheck,
  ScrollText,
  FileText,
  Building2,
  Scale,
} from "lucide-react";

const PILLARS = [
  { icon: Archive, title: "100-year preservation", body: "An archival record of contemporary art held independently for at least one century." },
  { icon: Globe2, title: "Global, independent", body: "A Dutch stichting — no commercial ownership, no market influence, no advertising." },
  { icon: Users2, title: "Artist-first", body: "Built with and for artists, collectors, registrars and scholars. Free for verified artists." },
  { icon: Landmark, title: "Transparent governance", body: "Annual reports, board oversight, and audited financials once active." },
];

const GOVERNANCE = [
  { icon: Building2, title: "Dutch stichting", body: "Registered as a non-profit foundation under Dutch law, with statutes filed at the Chamber of Commerce (KvK)." },
  { icon: Scale, title: "Independent board", body: "Multi-seat board with art-historical, legal, and technical expertise. No single party holds controlling rights." },
  { icon: ScrollText, title: "Public statutes", body: "Articles of association are public, including the non-distribution constraint and dissolution clauses." },
  { icon: FileText, title: "Annual reporting", body: "Annual activity and financial reports published openly once the Foundation is operationally active." },
];

const IMPACT = [
  { stat: "100 yrs", label: "Preservation horizon" },
  { stat: "Free", label: "For verified artists" },
  { stat: "0%", label: "Commission on sales — we don't sell" },
  { stat: "Open", label: "Public catalogue raisonné directory" },
];

const TEAM = [
  {
    name: "Founding board",
    role: "Composition in progress",
    body: "The founding board is being assembled with representatives from the artist, scholarly, and archival communities. Names will be published upon Chamber of Commerce filing.",
  },
  {
    name: "Advisory circle",
    role: "Artists, registrars, scholars",
    body: "An advisory circle of practising artists, museum registrars, and art historians informs the Foundation's archival standards and governance.",
  },
];

export default function FoundationPitch() {
  useEffect(() => {
    document.title = "The Foundation — Global Artist Registry";
    const desc = document.querySelector('meta[name="description"]');
    const txt = "The Global Artist Registry Foundation: a Dutch stichting preserving the documentary record of contemporary art for at least one hundred years.";
    if (desc) desc.setAttribute("content", txt);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">


      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Global Artist Registry Foundation
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <div className="mb-4 inline-block rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            The Foundation
          </div>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            An independent archive for the next hundred years of art.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            The Global Artist Registry Foundation is a Dutch <em>stichting</em> safeguarding
            the documentary record of contemporary artists — their works, exhibitions,
            provenance, and catalogues raisonnés — for scholars, families, and institutions
            a century from now.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/support"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90"
            >
              Become a founding supporter
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/donate"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-border px-6 text-sm font-semibold hover:bg-muted"
            >
              Make a donation
            </Link>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="bg-background p-8">
              <p.icon className="h-6 w-6 text-muted-foreground" />
              <h3 className="mt-4 font-serif text-lg">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Mission</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight">
              A permanent, structured record — owned by the artists who make it.
            </h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              Galleries close. Estates change hands. Websites disappear. The contemporary record
              is, by default, fragile. The Foundation exists to fix that — by giving every
              verified artist a permanent, structured archive that they own, control, and
              pass on.
            </p>
            <p>
              We do not sell artworks. We do not represent artists. We do not run an art market.
              We safeguard the documentary record so that scholars, families, museums and future
              catalogues raisonnés can rely on it a century from now.
            </p>
          </div>
        </div>
      </section>

      {/* Governance */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Governance</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight">
              Structured to outlast its founders.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {GOVERNANCE.map((g) => (
              <div key={g.title} className="rounded-lg border border-border bg-background p-6">
                <g.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="mt-3 font-serif text-lg">{g.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">People</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight">
              Built by a small, accountable team.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {TEAM.map((t) => (
              <div key={t.name} className="rounded-lg border border-border bg-background p-6">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.role}</p>
                <h3 className="mt-2 font-serif text-xl">{t.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Impact</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight">
              What your support builds.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Founding support funds the infrastructure of the Registry: verified artist
              records, secure archival storage, the public catalogue raisonné directory,
              and the long-term endowment that guarantees continuity beyond the founders.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
            {IMPACT.map((i) => (
              <div key={i.label} className="bg-background p-6 text-center">
                <div className="font-serif text-3xl">{i.stat}</div>
                <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {i.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 font-serif text-3xl leading-tight">
            Help define the Foundation's first decade.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            We are inviting a small group of founding supporters whose gifts of
            €10,000 and above will fund the Foundation's first ten years of operations
            and endowment.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/support"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90"
            >
              Speak to the Foundation
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/donate"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-border px-6 text-sm font-semibold hover:bg-muted"
            >
              Smaller gift
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-background">
        <div className="mx-auto max-w-4xl px-6 py-12 text-center text-xs leading-relaxed text-muted-foreground">
          The Global Artist Registry Foundation is a Dutch <em>stichting</em>. Donations are
          treated as gifts and are not subject to VAT. Formal donation receipts with the
          Foundation's KvK and RSIN registration details are issued for every gift.
        </div>
      </footer>
    </div>
  );
}
