import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Archive, Globe2, Users2, Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ApplicantType = "individual" | "foundation" | "corporation";
type Tier = "bronze" | "silver" | "gold" | "platinum";

const TIERS: { id: Tier; name: string; range: string; benefits: string }[] = [
  { id: "bronze",   name: "Bronze Founding Supporter",   range: "€10,000 – €24,999",  benefits: "Listed as a Founding Supporter in the Foundation's public register (unless anonymity is requested)." },
  { id: "silver",   name: "Silver Founding Supporter",   range: "€25,000 – €49,999",  benefits: "Silver recognition on the Supporters wall; annual report and briefing." },
  { id: "gold",     name: "Gold Founding Supporter",     range: "€50,000 – €99,999",  benefits: "Gold recognition; invitations to Foundation events and private briefings." },
  { id: "platinum", name: "Platinum Founding Supporter", range: "€100,000+",          benefits: "Named in perpetuity in the archive; permanent recognition; direct board access." },
];

const PILLARS = [
  { icon: Archive, title: "100-year preservation", body: "An archival record of contemporary art held independently for at least one century." },
  { icon: Globe2, title: "Global, independent", body: "A Dutch stichting — no commercial ownership, no market influence, no advertising." },
  { icon: Users2, title: "Artist-first", body: "Built with and for artists, collectors, registrars and scholars." },
  { icon: Landmark, title: "Transparent governance", body: "Annual reports, board oversight, and audited financials." },
];

export default function FoundingSupporter() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [applicantType, setApplicantType] = useState<ApplicantType>("individual");
  const [contactName, setContactName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [tier, setTier] = useState<Tier>("bronze");
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !email.trim()) {
      toast.error("Please provide your name and email.");
      return;
    }
    if (applicantType !== "individual" && !organizationName.trim()) {
      toast.error("Please provide your organisation's name.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("founding-supporter-application", {
        body: {
          applicant_type: applicantType,
          contact_name: contactName,
          organization_name: organizationName || undefined,
          email,
          phone,
          country,
          tier,
          pledge_amount_eur: pledgeAmount ? Math.round(parseFloat(pledgeAmount)) : undefined,
          anonymous_public: anonymous,
          message,
        },
      });
      if (error) throw error;
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast.error("Could not submit. Please email support@globalartistregistry.org");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-xl text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 mx-auto text-foreground" />
          <h1 className="text-3xl font-serif">Thank you.</h1>
          <p className="text-muted-foreground leading-relaxed">
            Your application to become a Founding Supporter has been received.
            A member of the GARF board will be in touch personally within the next few working days.
          </p>
          <p className="text-sm text-muted-foreground">
            A confirmation email has been sent to <span className="text-foreground">{email}</span>.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Return to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <header className="mb-12 space-y-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Global Artist Registry Foundation</p>
          <h1 className="text-4xl md:text-5xl font-serif leading-tight">Become a Founding Supporter</h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Founding Supporters make it possible for GARF to protect the archival record of contemporary art
            for the next hundred years. Your gift builds the foundation on which every future artist, scholar,
            and institution will stand.
          </p>
        </header>

        <section className="grid sm:grid-cols-2 gap-6 mb-14">
          {PILLARS.map((p) => (
            <div key={p.title} className="border border-border rounded-lg p-5">
              <p.icon className="w-5 h-5 mb-3" />
              <h3 className="font-medium mb-1">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
            </div>
          ))}
        </section>

        <section className="mb-14">
          <h2 className="text-2xl font-serif mb-6">Recognition tiers</h2>
          <div className="space-y-3">
            {TIERS.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setTier(t.id)}
                className={`w-full text-left border rounded-lg p-5 transition ${
                  tier === t.id ? "border-foreground bg-secondary/40" : "border-border hover:border-foreground/40"
                }`}
              >
                <div className="flex items-baseline justify-between gap-4 mb-1">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{t.range}</span>
                </div>
                <p className="text-sm text-muted-foreground">{t.benefits}</p>
              </button>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6 border border-border rounded-lg p-6 md:p-8" autoComplete="off">
          <h2 className="text-2xl font-serif">Your application</h2>

          <div className="space-y-2">
            <Label>I am applying as</Label>
            <RadioGroup value={applicantType} onValueChange={(v) => setApplicantType(v as ApplicantType)} className="grid sm:grid-cols-3 gap-2">
              {[
                { id: "individual",  label: "An individual" },
                { id: "foundation",  label: "A foundation or trust" },
                { id: "corporation", label: "A corporation" },
              ].map((o) => (
                <label
                  key={o.id}
                  className={`border rounded-md px-4 py-3 cursor-pointer text-sm ${
                    applicantType === o.id ? "border-foreground bg-secondary/40" : "border-border"
                  }`}
                >
                  <RadioGroupItem value={o.id} className="sr-only" />
                  {o.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Full name *</Label>
              <Input id="contact_name" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          {applicantType !== "individual" && (
            <div className="space-y-2">
              <Label htmlFor="org">Organisation name *</Label>
              <Input id="org" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required />
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preferred tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as Tier)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIERS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} — {t.range}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Indicative pledge amount (EUR, optional)</Label>
              <Input id="amount" type="number" min="0" step="1000" value={pledgeAmount} onChange={(e) => setPledgeAmount(e.target.value)} placeholder="e.g. 25000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything you'd like the board to know — questions, motivations, timing, or specific projects you care about." />
          </div>

          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(!!v)} className="mt-0.5" />
            <span className="text-muted-foreground">
              I prefer to remain anonymous in any public recognition (Supporters wall, annual reports, press).
            </span>
          </label>

          <div className="pt-2">
            <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto">
              {submitting ? "Submitting…" : "Submit application"}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              This is an expression of intent, not a legally binding pledge. A board member will follow up personally.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
