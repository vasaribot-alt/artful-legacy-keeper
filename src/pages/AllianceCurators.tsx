import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle2, BookOpen, Network, ShieldCheck, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PILLARS = [
  { icon: Archive, title: "A permanent archival record", body: "Every exhibition you curate becomes part of a 100-year archival record — independent of any museum, gallery, or platform." },
  { icon: Network, title: "Direct access to artists", body: "Discover verified artists, browse full catalogues of work, and reach out through the artist's own registered profile." },
  { icon: BookOpen, title: "Curatorial visibility", body: "Your exhibitions, catalogue essays, and publications are linked to artists and preserved in scholarly context." },
  { icon: ShieldCheck, title: "Independent & non-commercial", body: "GARF is a Dutch stichting. No advertising, no data resale, no market interference." },
];

const BENEFITS = [
  "Free membership during the Founding phase",
  "Curator profile with a verified GARF identifier",
  "Access to Founding Artists and their full archival records",
  "Ability to link your exhibitions and publications to artists' permanent records",
  "Invitations to curator briefings and Foundation events",
];

export default function AllianceCurators() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [referral, setReferral] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please provide your name and email.");
      return;
    }
    if (!consent) {
      toast.error("Please confirm you'd like the Foundation to contact you.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("global_alliance_members").insert({
        category: "curator",
        full_name: fullName.trim(),
        email: email.trim(),
        institution: institution.trim() || null,
        role_title: roleTitle.trim() || null,
        country: country.trim() || null,
        website: website.trim() || null,
        linkedin: linkedin.trim() || null,
        referral_source: referral.trim() || null,
        message: message.trim() || null,
        consent_contact: true,
      });
      if (error) throw error;
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast.error("Could not submit. Please email info@globalartistregistry.org");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-xl text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 mx-auto text-foreground" />
          <h1 className="text-3xl font-serif">Welcome to the Alliance.</h1>
          <p className="text-muted-foreground leading-relaxed">
            Thank you for your interest in joining the GARF Global Alliance as a curator.
            A member of the Foundation will be in touch personally within the next few working days.
          </p>
          <p className="text-sm text-muted-foreground">
            A confirmation will be sent to <span className="text-foreground">{email}</span>.
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
          <p className="text-xs uppercase tracking-widest text-muted-foreground">GARF Global Alliance · Curators</p>
          <h1 className="text-4xl md:text-5xl font-serif leading-tight">Join the Alliance as a Curator</h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Curators are the essential bond between artists, institutions, and the public.
            The GARF Global Alliance invites curators — independent or institutional —
            to help build and safeguard the archival record of contemporary art for the next hundred years.
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
          <h2 className="text-2xl font-serif mb-4">What membership includes</h2>
          <ul className="space-y-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex gap-3 text-sm">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-foreground" />
                <span className="text-muted-foreground">{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6 border border-border rounded-lg p-6 md:p-8" autoComplete="off">
          <h2 className="text-2xl font-serif">Register your interest</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name *</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="institution">Institution / affiliation</Label>
              <Input id="institution" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Museum, gallery, or independent" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role / title</Label>
              <Input id="role" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="e.g. Senior Curator" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral">How did you hear about GARF?</Label>
              <Input id="referral" value={referral} onChange={(e) => setReferral(e.target.value)} placeholder="Colleague, association, article…" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input id="linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Recent or upcoming exhibitions, artists you work with, or how you'd like to contribute." />
          </div>

          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
            <span className="text-muted-foreground">
              I agree that the Global Artist Registry Foundation may contact me about the Global Alliance.
              I understand that my details will be handled in accordance with the Foundation's privacy policy.
            </span>
          </label>

          <div className="pt-2">
            <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto">
              {submitting ? "Submitting…" : "Submit application"}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              This is a non-binding registration of interest. A member of the Foundation will follow up personally.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
