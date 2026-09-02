import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, Mail, MapPin, Phone, Video } from "lucide-react";

// 30 minute meeting, availability configured in Calendly to 08:00 to 18:00 CET.
// Set this to the real Calendly event link once the event type exists.
// Leave as null to hide the embed and show the message form instead.
const CALENDLY_URL: string | null = "https://calendly.com/jan-globalartistregistry/30min";

const contactSchema = z.object({
  name: z.string().trim().min(1, { message: "Please enter your name" }).max(120),
  email: z
    .string()
    .trim()
    .min(1, { message: "Please enter your email" })
    .email({ message: "Please enter a valid email address" })
    .max(255),
  organisation: z.string().trim().max(200).optional(),
  role: z.string().trim().max(80).optional(),
  subject: z.string().trim().max(200).optional(),
  message: z
    .string()
    .trim()
    .min(10, { message: "Please write a few words so we can help you properly" })
    .max(4000),
});

const roles = [
  "Artist",
  "Estate",
  "Gallery",
  "Curator",
  "Registrar",
  "Museum",
  "University",
  "Collector",
  "Foundation or donor",
  "Press",
  "Other",
];

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    organisation: "",
    role: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "Contact the Global Artist Registry Foundation";
    const desc =
      "Contact GARF or book a 30 minute video meeting with the foundation. Meetings available 08:00 to 18:00 CET.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    if (!CALENDLY_URL) return;
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);


  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      organisation: parsed.data.organisation || null,
      role: parsed.data.role || null,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    });
    setSubmitting(false);

    if (error) {
      toast.error("We could not send your message. Please try again or email us directly.");
      return;
    }
    setSent(true);
    toast.success("Thank you. Your message has been sent.");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> <GarfLogo className="h-7" />
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <a href="#schedule" className="text-muted-foreground hover:text-foreground transition-colors">
              Book a meeting
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="px-6 pt-20 pb-12 border-b border-border">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">Contact</p>
            <h1 className="text-4xl md:text-5xl leading-[1.1] font-serif mb-6 text-balance">
              Talk to the foundation
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
              Write to us with a question, or book a 30 minute video meeting at a time that suits you.
              Meetings are available Monday to Friday, 08:00 to 18:00 CET.
            </p>
          </div>
        </section>

        <section className="px-6 py-16 border-b border-border">
          <div className="max-w-5xl mx-auto grid gap-12 md:grid-cols-[1.3fr_1fr]">
            <div>
              <h2 className="text-2xl font-serif mb-6">Send us a message</h2>
              {sent ? (
                <div className="border border-border rounded-sm p-8">
                  <h3 className="text-lg mb-2">Message received</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Thank you for writing to us. We reply within two working days. If your matter is
                    time sensitive, book a meeting below and we will speak sooner.
                  </p>
                  <Button variant="outline" onClick={() => { setSent(false); setForm({ name: "", email: "", organisation: "", role: "", subject: "", message: "" }); }}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={120} autoComplete="off" />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={255} autoComplete="off" />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organisation">Organisation (optional)</Label>
                      <Input id="organisation" value={form.organisation} onChange={(e) => update("organisation", e.target.value)} maxLength={200} autoComplete="off" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">I am a (optional)</Label>
                      <Select value={form.role} onValueChange={(v) => update("role", v)}>
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject (optional)</Label>
                    <Input id="subject" value={form.subject} onChange={(e) => update("subject", e.target.value)} maxLength={200} autoComplete="off" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" rows={7} value={form.message} onChange={(e) => update("message", e.target.value)} maxLength={4000} />
                    {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                  </div>
                  <Button type="submit" size="lg" disabled={submitting}>
                    {submitting ? "Sending" : "Send message"}
                  </Button>
                </form>
              )}
            </div>

            <aside className="space-y-8 text-sm">
              <div>
                <h3 className="font-medium mb-3">Global Artist Registry Foundation</h3>
                <div className="space-y-3 text-muted-foreground">
                  <p className="flex gap-3">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      Jan Pieterszoon Coenstraat 7<br />
                      2595 WP 's-Gravenhage<br />
                      The Hague, Netherlands
                    </span>
                  </p>
                  <p className="flex gap-3">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                    <a href="mailto:contact@globalartistregistry.org" className="hover:text-foreground break-all">
                      contact@globalartistregistry.org
                    </a>
                  </p>
                  <p className="flex gap-3">
                    <Phone className="w-4 h-4 mt-0.5 shrink-0" />
                    <a href="tel:+31850600529" className="hover:text-foreground">
                      +31 850 600 529
                    </a>
                  </p>
                </div>
              </div>
              <div className="border-t border-border pt-6 space-y-3 text-muted-foreground">
                <p className="flex gap-3">
                  <CalendarClock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Meetings 08:00 to 18:00 CET, Monday to Friday.</span>
                </p>
                <p className="flex gap-3">
                  <Video className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Every booking sends you a video meeting link and a calendar invitation.</span>
                </p>
              </div>
              <div className="border-t border-border pt-6 text-muted-foreground">
                <p>KvK 42024490</p>
                <p>Stichting under Dutch law</p>
              </div>
            </aside>
          </div>
        </section>

        <section id="schedule" className="px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-serif mb-4">Book a 30 minute video meeting</h2>
              <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
                {CALENDLY_URL
                  ? "Pick a slot below. You will receive a confirmation with a video link, and you can reschedule at any time. Available 08:00 to 18:00 CET."
                  : "Meetings are held 08:00 to 18:00 CET. Send a request with two or three times that suit you and we will confirm with a video link."}
              </p>
            </div>
            {CALENDLY_URL ? (
              <>
                <div
                  className="calendly-inline-widget border border-border rounded-sm overflow-hidden"
                  data-url={`${CALENDLY_URL}?hide_gdpr_banner=1&primary_color=111111`}
                  style={{ minWidth: "320px", height: "760px" }}
                />
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Scheduling not loading?{" "}
                  <a href={CALENDLY_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
                    Open the booking page in a new tab
                  </a>
                  .
                </p>
              </>
            ) : (
              <div className="border border-border rounded-sm p-8 text-center">
                <Video className="w-5 h-5 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                  Use the message form above and mention "video meeting" with your preferred times.
                  We reply within one working day.
                </p>
                <a
                  href="#message"
                  className="inline-block px-5 py-2.5 text-sm bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity"
                >
                  Request a meeting
                </a>
              </div>
            )}

          </div>
        </section>
      </main>

      <footer className="py-10 px-6 border-t border-border text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <span>© 2026 Global Artist Registry Foundation</span>
          <span>100-Year Preservation Plan</span>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
