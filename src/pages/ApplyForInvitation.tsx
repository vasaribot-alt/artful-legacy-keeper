import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const ApplyForInvitation = () => {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    country: "",
    city: "",
    website: "",
    birth_year: "",
    practice_summary: "",
    cv_url: "",
    referred_by: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.full_name.trim().length < 2) return toast.error("Please enter your full name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return toast.error("Please enter a valid email address");
    if (form.practice_summary.trim().length < 20) return toast.error("Please tell us a little about your practice");

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("invitation-request", {
      body: {
        ...form,
        birth_year: form.birth_year ? Number(form.birth_year) : undefined,
        applicant_role: applicantRole,
        source: "apply_page",
      },
    });
    setSubmitting(false);

    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || "Could not send your application. Please try again.");
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-14">
        {done ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-5 text-foreground" />
            <h1 className="font-serif text-3xl mb-3">Your request is with us</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Every request is read by a person. If your application is accepted you will receive an invite code
              by email together with instructions for creating your archive.
            </p>
            <Link to="/" className="inline-block mt-8">
              <Button variant="outline">Back to home</Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-4xl mb-3">Apply for an invitation</h1>
            <p className="text-muted-foreground text-sm mb-10 max-w-xl">
              The registry is invitation only. If you have not received a code, tell us about your work and we will
              review your application. Registration is free for life for every ID verified artist, and records are
              kept in accordance with our 100 Year Preservation Plan.
            </p>

            <form onSubmit={submit} className="space-y-6" autoComplete="off">
              <div>
                <Label>I am applying as</Label>
                <Select value={applicantRole} onValueChange={setApplicantRole}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" value={form.full_name} onChange={set("full_name")} className="mt-1.5" required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={set("email")} className="mt-1.5" required />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={set("city")} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={form.country} onChange={set("country")} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="birth_year">Year of birth <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="birth_year" inputMode="numeric" value={form.birth_year} onChange={set("birth_year")} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="website">Website <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="website" value={form.website} onChange={set("website")} placeholder="https://" className="mt-1.5" />
                </div>
              </div>

              <div>
                <Label htmlFor="practice_summary">About your work</Label>
                <Textarea
                  id="practice_summary"
                  value={form.practice_summary}
                  onChange={set("practice_summary")}
                  rows={5}
                  className="mt-1.5"
                  placeholder="Your practice, exhibitions, representation, and what you would like to archive."
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cv_url">Link to CV or portfolio <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="cv_url" value={form.cv_url} onChange={set("cv_url")} placeholder="https://" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="referred_by">Referred by <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="referred_by" value={form.referred_by} onChange={set("referred_by")} placeholder="Gallery, organisation or artist" className="mt-1.5" />
                </div>
              </div>

              <div>
                <Label htmlFor="message">Anything else <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea id="message" value={form.message} onChange={set("message")} rows={3} className="mt-1.5" />
              </div>

              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? "Sending..." : "Send application"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Already have a code? <Link to="/register" className="underline">Register here</Link>.
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default ApplyForInvitation;
