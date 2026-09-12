import GarfLogo from "@/components/GarfLogo";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InstagramLink } from "@/components/SocialLinks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { z } from "zod";

const signatorySchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  country: z.string().trim().max(80).optional(),
  organisation: z.string().trim().max(160).optional(),
  comment: z.string().trim().max(600).optional(),
  signatory_type: z.enum(["collector", "artist", "curator", "gallery", "institution", "other"]),
  is_public: z.boolean(),
});

const principles = [
  {
    title: "The artist is the source",
    description:
      "A work's record should begin with the person who made it, confirmed by a verified identity, not reconstructed later from invoices and memory.",
  },
  {
    title: "Documentation must outlive the platform",
    description:
      "Records held on subscription software disappear when the subscription ends. The archive of a generation should not depend on a monthly payment.",
  },
  {
    title: "Provenance is a shared interest",
    description:
      "Collectors, galleries, scholars and estates all lose when the record is thin. A common, independent registry serves all of them.",
  },
  {
    title: "Independence matters",
    description:
      "The registry should be held by a non-profit foundation with no commercial owner and no interest in selling art.",
  },
];

const types = [
  { value: "collector", label: "Collector" },
  { value: "artist", label: "Artist" },
  { value: "curator", label: "Curator" },
  { value: "gallery", label: "Gallery" },
  { value: "institution", label: "Institution" },
  { value: "other", label: "Other" },
];

type PublicSignatory = {
  display_name: string;
  country: string | null;
  signatory_type: string;
  organisation: string | null;
};

const StatementOfSupport = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [comment, setComment] = useState("");
  const [signatoryType, setSignatoryType] = useState("collector");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [signed, setSigned] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [signatories, setSignatories] = useState<PublicSignatory[]>([]);

  useEffect(() => {
    document.title = "Statement of Support — Global Artist Registry Foundation";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "Collectors, artists and institutions supporting verified, independent documentation of contemporary art. Add your name to the Statement of Support.",
      );
    }
  }, []);

  const loadSignatories = async () => {
    const [{ data: rows }, { data: total }] = await Promise.all([
      supabase.rpc("get_statement_signatories"),
      supabase.rpc("get_statement_signatory_count"),
    ]);
    if (Array.isArray(rows)) setSignatories(rows as PublicSignatory[]);
    if (typeof total === "number") setCount(total);
  };

  useEffect(() => {
    loadSignatories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signatorySchema.safeParse({
      full_name: fullName,
      email,
      country: country || undefined,
      organisation: organisation || undefined,
      comment: comment || undefined,
      signatory_type: signatoryType,
      is_public: isPublic,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("statement_signatories").insert({
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      country: parsed.data.country ?? null,
      organisation: parsed.data.organisation ?? null,
      comment: parsed.data.comment ?? null,
      signatory_type: parsed.data.signatory_type,
      is_public: parsed.data.is_public,
    });
    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("This email address has already signed. Thank you.");
        return;
      }
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setSigned(true);
    loadSignatories();
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <GarfLogo className="h-20" />
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/why-garf-matters" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Why GARF
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

      <header className="pt-36 pb-14 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">Statement of Support</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-[1.05] mb-6 text-balance">
            Verified documentation is in the interest of everyone who collects.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A declaration by collectors, artists, curators and institutions who believe the record of
            contemporary art should be authenticated by the artist and preserved independently.
          </p>
          {count !== null && count > 0 && (
            <p className="mt-8 text-sm text-muted-foreground font-mono">
              {count} {count === 1 ? "signatory" : "signatories"} so far
            </p>
          )}
        </div>
      </header>

      <section className="py-14 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-2xl md:text-3xl mb-10 text-center">What we are saying</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {principles.map((p) => (
              <div key={p.title} className="border border-border rounded-lg p-6">
                <h3 className="font-serif text-lg mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sign" className="py-16 px-6 border-t border-border">
        <div className="max-w-xl mx-auto">
          {signed ? (
            <div className="border border-border rounded-lg p-8 text-center space-y-4">
              <CheckCircle2 className="mx-auto h-10 w-10 text-foreground" />
              <h2 className="font-serif text-2xl">Thank you for adding your name</h2>
              <p className="text-sm text-muted-foreground">
                We will keep you informed about the work of the Foundation. Your details are never
                shared or sold.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
                <Link to="/why-garf-matters">
                  <Button variant="outline">Read why this matters</Button>
                </Link>
                <Link to="/register">
                  <Button>
                    Create an account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-2xl md:text-3xl mb-2 text-center">Add your name</h2>
              <p className="text-sm text-muted-foreground text-center mb-8">
                You choose whether your name appears publicly. Private signatures still count towards
                the total.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                <div>
                  <Label htmlFor="sos-name">Full name</Label>
                  <Input
                    id="sos-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={120}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="sos-email">Email</Label>
                  <Input
                    id="sos-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                    className="mt-1.5"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sos-type">I am a</Label>
                    <Select value={signatoryType} onValueChange={setSignatoryType}>
                      <SelectTrigger id="sos-type" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sos-country">Country</Label>
                    <Input
                      id="sos-country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      maxLength={80}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="sos-org">
                    Collection or organisation <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="sos-org"
                    value={organisation}
                    onChange={(e) => setOrganisation(e.target.value)}
                    maxLength={160}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="sos-comment">
                    A short comment <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="sos-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={600}
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex items-start gap-3 pt-1">
                  <Checkbox
                    id="sos-public"
                    checked={isPublic}
                    onCheckedChange={(v) => setIsPublic(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="sos-public" className="font-normal leading-relaxed">
                    List me publicly. Only my first name and country are shown. Leave this unticked to
                    sign privately.
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing..." : "Sign the statement"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Your email is used only to keep you informed about the Foundation. It is never shared
                  or published.
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      {signatories.length > 0 && (
        <section className="py-16 px-6 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl mb-8 text-center">Signatories</h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {signatories.map((s, i) => (
                <span key={i} className="border border-border rounded-full px-4 py-1.5 text-sm">
                  {s.display_name}
                  {s.country ? `, ${s.country}` : ""}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-6">
              Signatories who asked to remain private are not shown.
            </p>
          </div>
        </section>
      )}

      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-muted-foreground font-mono">
            globalartistregistry.org · contact@globalartistregistry.org · KVK 42024490
          </p>
        </div>
      </section>
    </div>
  );
};

export default StatementOfSupport;
