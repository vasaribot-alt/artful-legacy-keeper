import GarfLogo from "@/components/GarfLogo";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Landmark,
  Archive,
  Globe2,
  Users2,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Frequency = "one_off" | "annual" | "pledge_multi_year" | "undecided";

const TIER_LADDER = [
  { eur: 500_000, name: "Founding Patron", line: "Named in perpetuity in the Foundation's archive; private annual briefing." },
  { eur: 250_000, name: "Legacy Patron", line: "Permanent recognition on the Supporters wall; annual report." },
  { eur: 100_000, name: "Archive Patron", line: "Listed as Patron; invitation to Foundation events." },
  { eur: 50_000, name: "Benefactor", line: "Listed as Benefactor on the Supporters wall." },
  { eur: 25_000, name: "Patron", line: "Listed as Patron on the Supporters wall." },
  { eur: 10_000, name: "Friend of the Foundation", line: "Listed as a Friend on the Supporters wall." },
];

const PILLARS = [
  { icon: Archive, title: "100-year preservation", body: "An archival record of contemporary art held independently for at least one century." },
  { icon: Globe2, title: "Global, independent", body: "A Dutch stichting, no commercial ownership, no market influence, no advertising." },
  { icon: Users2, title: "Artist-first", body: "Built with and for artists, collectors, registrars and scholars. Free for verified artists." },
  { icon: Landmark, title: "Transparent governance", body: "Annual reports, board oversight, and audited financials once active." },
];

export default function Support() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [country, setCountry] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [frequency, setFrequency] = useState<Frequency>("one_off");
  const [preferred, setPreferred] = useState<"email" | "phone" | "video_call">("email");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please provide your name and email.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("major-gift-inquiry", {
        body: {
          full_name: fullName,
          email,
          phone,
          organisation,
          country,
          estimated_amount_eur: amount ? Math.round(parseFloat(amount)) : undefined,
          intended_frequency: frequency,
          preferred_contact: preferred,
          message,
        },
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not send your message. Please email support@globalartistregistry.org");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <GarfLogo className="h-9" />
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <div className="mb-4 inline-block rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            Foundation support
          </div>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            Help preserve the record of contemporary art, for the next hundred years.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            The Global Artist Registry Foundation is building an independent, archival record
            of artists and artworks intended to outlast institutions, markets, and generations.
            We are seeking founding supporters whose gifts will define the Foundation's first decade.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#major-gift"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90"
            >
              Speak to the Foundation
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/donate"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-border px-6 text-sm font-semibold hover:bg-muted"
            >
              Make a smaller gift
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
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Our mission</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight">
              A permanent home for the work of living artists.
            </h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              Galleries close. Estates change hands. Websites disappear. The contemporary record
              is, by default, fragile. The Foundation exists to fix that, by giving every verified
              artist a permanent, structured archive that they own, control, and pass on.
            </p>
            <p>
              We do not sell artworks, we do not represent artists, and we do not run an art market.
              We safeguard the documentary record so that scholars, families, museums and future
              catalogues raisonnés can rely on it a century from now.
            </p>
          </div>
        </div>
      </section>

      {/* Tier ladder */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Recognition</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight">
              Founding supporters define the Foundation's first decade.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              All gifts of €10,000 and above are recognised as founding contributions.
              Larger gifts receive permanent recognition and naming opportunities that
              persist for the life of the Foundation.
            </p>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
            {TIER_LADDER.map((t) => (
              <div key={t.name} className="flex flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-baseline gap-4">
                  <span className="font-serif text-xl tabular-nums">
                    €{t.eur.toLocaleString("en-US")}+
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-wide">{t.name}</span>
                </div>
                <p className="max-w-md text-sm text-muted-foreground">{t.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Major-gift contact form */}
      <section id="major-gift" className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-10 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Major gifts</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight">
              Tell us about your intended contribution.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              For gifts of €10,000 or more we prefer to speak personally and arrange a direct
              bank transfer, no card processing fees, full traceability, formal receipt.
            </p>
          </div>

          {done ? (
            <div className="rounded-lg border border-border bg-muted/30 p-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[#7ac143]" />
              <h3 className="mt-4 font-serif text-xl">Thank you, {fullName.split(" ")[0]}.</h3>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                We've received your message and will reply within two business days, normally
                from a member of the board. Bank transfer details will be sent personally,
                together with a formal pledge confirmation.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium underline"
              >
                Return to the Foundation
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-border bg-background p-6 sm:p-10" autoComplete="off">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="full_name">Full name *</Label>
                  <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="country">Country (optional)</Label>
                  <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="organisation">Organisation / foundation (optional)</Label>
                  <Input id="organisation" value={organisation} onChange={(e) => setOrganisation(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="amount">Estimated amount (EUR)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                    <Input id="amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-7" placeholder="e.g. 50000" />
                  </div>
                </div>
                <div>
                  <Label>Intended frequency</Label>
                  <RadioGroup value={frequency} onValueChange={(v) => setFrequency(v as Frequency)} className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <label className="flex items-center gap-2"><RadioGroupItem value="one_off" /> One-off</label>
                    <label className="flex items-center gap-2"><RadioGroupItem value="annual" /> Annual</label>
                    <label className="flex items-center gap-2"><RadioGroupItem value="pledge_multi_year" /> Multi-year pledge</label>
                    <label className="flex items-center gap-2"><RadioGroupItem value="undecided" /> Undecided</label>
                  </RadioGroup>
                </div>
              </div>

              <div>
                <Label>Preferred way to be contacted</Label>
                <RadioGroup value={preferred} onValueChange={(v) => setPreferred(v as typeof preferred)} className="mt-2 flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2"><RadioGroupItem value="email" /> Email</label>
                  <label className="flex items-center gap-2"><RadioGroupItem value="phone" /> Phone</label>
                  <label className="flex items-center gap-2"><RadioGroupItem value="video_call" /> Video call</label>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea
                  id="message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything you'd like the Foundation to know, restrictions, timing, naming preferences…"
                />
              </div>

              <div className="flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  Your details are kept confidential and used only to follow up on this inquiry.
                </p>
                <Button type="submit" size="lg" disabled={submitting} className="min-w-[180px]">
                  {submitting ? "Sending…" : "Send to the Foundation"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Footer note */}
      <footer className="bg-background">
        <div className="mx-auto max-w-4xl px-6 py-12 text-center text-xs leading-relaxed text-muted-foreground">
          The Global Artist Registry Foundation is a Dutch <em>stichting</em>. Donations are
          treated as gifts and are not subject to VAT. Formal donation receipts with the
          Foundation's registration details are issued for every gift.
        </div>
      </footer>
    </div>
  );
}
