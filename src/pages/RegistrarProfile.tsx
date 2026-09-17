import GarfLogo from "@/components/GarfLogo";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ImageLightbox } from "@/components/ImageLightbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Languages,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

interface EntryImage {
  id: string;
  storage_path: string;
  caption: string | null;
  credit: string | null;
}

interface Entry {
  id: string;
  kind: string;
  title: string | null;
  organisation: string | null;
  location: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
  description: string | null;
  display_order: number;
  images: EntryImage[];
}

interface VerifiedRegistrar {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  specializations: string[];
  languages: string[];
  geographic_coverage: string | null;
  professional_statement: string | null;
  credentials: string | null;
  years_experience: number | null;
  arcs_member: boolean;
  arcs_member_id: string | null;
  nationality?: string | null;
  education?: string | null;
  work_areas?: string[] | null;
  cms_experience?: any;
  entries?: Entry[];
}

const yearRange = (e: Entry) => {
  if (e.start_year && e.end_year) return `${e.start_year}-${e.end_year}`;
  if (e.start_year && e.is_current) return `${e.start_year}-present`;
  return e.start_year ? String(e.start_year) : e.end_year ? String(e.end_year) : "";
};

const RegistrarProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [registrar, setRegistrar] = useState<VerifiedRegistrar | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [lightbox, setLightbox] = useState<{ images: string[]; captions: string[]; index: number } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("get_registrar_presentation", {
        _user_id: userId,
      });
      if (error) {
        console.error("Failed to load registrar:", error);
        setRegistrar(null);
      } else {
        const row = (data as any[] | null)?.[0];
        if (row) {
          const entries: Entry[] = Array.isArray(row.entries) ? row.entries : [];
          setRegistrar({
            ...row,
            specializations: row.specializations || [],
            languages: row.languages || [],
            entries: entries.map((e) => ({ ...e, images: e.images || [] })),
          });
        } else {
          setRegistrar(null);
        }
      }
      setLoading(false);
    })();
  }, [userId]);

  const publicUrl = (path: string) =>
    supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;

  const grouped = useMemo(() => {
    const all = registrar?.entries || [];
    const by = (kind: string) =>
      all
        .filter((e) => e.kind === kind)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return { positions: by("position"), education: by("education"), projects: by("project") };
  }, [registrar]);

  const location = useMemo(() => {
    if (!registrar) return null;
    return [registrar.city, registrar.country].filter(Boolean).join(", ") || null;
  }, [registrar]);

  const openContact = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.info("Please sign in to contact a registrar");
      navigate("/login");
      return;
    }
    setContactMessage("");
    setContactOpen(true);
  };

  const handleSendInquiry = async () => {
    if (!registrar) return;
    setSending(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Session expired");
      setSending(false);
      return;
    }
    const { error } = await supabase.from("registrar_access").insert({
      owner_id: user.id,
      registrar_id: registrar.user_id,
      requested_by: "owner",
      status: "pending",
      message: contactMessage.trim() || null,
    });
    if (error) {
      toast.error("Failed to send inquiry");
    } else {
      toast.success("Inquiry sent! The registrar will review your request.");
      setContactOpen(false);
      setContactMessage("");
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <GarfLogo className="h-20" />
          </Link>
          <Link
            to="/registrars"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Directory
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="space-y-6">
              <div className="h-24 bg-secondary animate-pulse rounded-sm" />
              <div className="h-48 bg-secondary animate-pulse rounded-sm" />
            </div>
          ) : !registrar ? (
            <div className="text-center py-20">
              <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <h1 className="text-2xl mb-2">Presentation not available</h1>
              <p className="text-muted-foreground text-sm">
                This registrar is not currently listed in the public directory.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-6">
                <Link to="/registrars">Back to directory</Link>
              </Button>
            </div>
          ) : (
            <article className="space-y-12">
              {/* Header */}
              <header className="flex flex-col sm:flex-row sm:items-start gap-6">
                <Avatar className="w-24 h-24 rounded-sm flex-shrink-0">
                  {registrar.avatar_url && (
                    <AvatarImage
                      src={registrar.avatar_url}
                      alt={registrar.full_name || "Registrar"}
                      className="object-cover object-center"
                    />
                  )}
                  <AvatarFallback className="rounded-sm bg-secondary text-2xl">
                    {registrar.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Verified Registrar
                  </p>
                  <h1 className="text-3xl md:text-4xl leading-tight flex items-center gap-3 flex-wrap">
                    {registrar.full_name || "Unnamed registrar"}
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    {location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {location}
                      </span>
                    )}
                    {registrar.years_experience != null && (
                      <span>
                        {registrar.years_experience} year
                        {registrar.years_experience !== 1 ? "s" : ""} experience
                      </span>
                    )}
                    {registrar.arcs_member && (
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> ARCS member
                        {registrar.arcs_member_id
                          ? ` · ${registrar.arcs_member_id}`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
              </header>

              {/* Statement */}
              {registrar.professional_statement && (
                <section className="space-y-3">
                  <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Professional statement
                  </h2>
                  <p className="text-lg leading-relaxed whitespace-pre-wrap [hyphens:none] break-words">
                    {registrar.professional_statement}
                  </p>
                </section>
              )}

              {/* Background */}
              {registrar.credentials && (
                <section className="space-y-3">
                  <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Background and credentials
                  </h2>
                  <p className="text-base leading-relaxed whitespace-pre-wrap [hyphens:none] break-words text-muted-foreground">
                    {registrar.credentials}
                  </p>
                </section>
              )}

              {/* Career */}
              {grouped.positions.length > 0 && (
                <section className="space-y-6 pt-8 border-t border-border">
                  <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Career
                  </h2>
                  <div className="space-y-7">
                    {grouped.positions.map((e) => (
                      <div key={e.id} className="space-y-1.5">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {yearRange(e)}
                          </span>
                          <h3 className="text-lg leading-snug">
                            {[e.organisation, e.location].filter(Boolean).join(", ")}
                          </h3>
                        </div>
                        {e.title && <p className="text-sm">{e.title}</p>}
                        {e.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap [hyphens:none] break-words">
                            {e.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Education */}
              {grouped.education.length > 0 && (
                <section className="space-y-6 pt-8 border-t border-border">
                  <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Education
                  </h2>
                  <div className="space-y-5">
                    {grouped.education.map((e) => (
                      <div key={e.id} className="space-y-1">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {yearRange(e)}
                          </span>
                          <h3 className="text-base leading-snug">
                            {[e.organisation, e.location].filter(Boolean).join(", ")}
                          </h3>
                        </div>
                        {e.title && <p className="text-sm text-muted-foreground">{e.title}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Projects */}
              {grouped.projects.length > 0 && (
                <section className="space-y-8 pt-8 border-t border-border">
                  <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Selected project work
                  </h2>
                  <div className="space-y-8">
                    {grouped.projects.map((e) => {
                      const images = e.images.map((i) => publicUrl(i.storage_path));
                      const captions = e.images.map((i) => i.caption || "");
                      return (
                        <div key={e.id} className="space-y-3">
                          <div className="flex flex-wrap items-baseline gap-x-3">
                            {yearRange(e) && (
                              <span className="text-sm text-muted-foreground tabular-nums">
                                {yearRange(e)}
                              </span>
                            )}
                            <h3 className="text-lg leading-snug">
                              {e.title ||
                                [e.organisation, e.location].filter(Boolean).join(", ")}
                            </h3>
                          </div>
                          {e.title && (e.organisation || e.location) && (
                            <p className="text-sm text-muted-foreground">
                              {[e.organisation, e.location].filter(Boolean).join(", ")}
                            </p>
                          )}
                          {e.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap [hyphens:none] break-words">
                              {e.description}
                            </p>
                          )}
                          {images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                              {images.map((src, idx) => (
                                <button
                                  key={e.images[idx].id}
                                  type="button"
                                  onClick={() => setLightbox({ images, captions, index: idx })}
                                  className="group"
                                >
                                  <img
                                    src={src}
                                    alt={captions[idx] || e.title || "Project photograph"}
                                    loading="lazy"
                                    className="w-full aspect-square object-cover rounded-sm border border-border transition-opacity group-hover:opacity-80"
                                  />
                                  {captions[idx] && (
                                    <span className="block text-xs text-muted-foreground mt-1.5 text-left">
                                      {captions[idx]}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Details */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2 border-t border-border">
                {registrar.specializations.length > 0 && (
                  <div className="space-y-3 pt-8">
                    <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Specializations
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {registrar.specializations.map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-6 pt-8">
                  {registrar.languages.length > 0 && (
                    <div className="space-y-2">
                      <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                        <Languages className="w-3.5 h-3.5" /> Languages
                      </h2>
                      <p className="text-sm">{registrar.languages.join(", ")}</p>
                    </div>
                  )}
                  {registrar.geographic_coverage && (
                    <div className="space-y-2">
                      <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" /> Geographic coverage
                      </h2>
                      <p className="text-sm [hyphens:none] break-words">
                        {registrar.geographic_coverage}
                      </p>
                    </div>
                  )}
                </div>

                {(registrar.work_areas?.length || 0) > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Areas of work
                    </h2>
                    <p className="text-sm">{(registrar.work_areas || []).join(", ")}</p>
                  </div>
                )}

                {Array.isArray(registrar.cms_experience) &&
                  registrar.cms_experience.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Collection systems
                      </h2>
                      <p className="text-sm">
                        {registrar.cms_experience
                          .map((c: any) => c?.system)
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}
              </section>

              {/* Contact */}
              <section className="pt-8 border-t border-border space-y-3">
                <Button onClick={openContact} className="gap-1.5">
                  <Mail className="w-4 h-4" /> Contact this registrar
                </Button>
                <p className="text-xs text-muted-foreground">
                  References available on request.
                </p>
                <p className="text-xs text-muted-foreground">
                  Inquiries are routed through the Foundation. Contact details
                  remain private until the registrar accepts your request.
                </p>
              </section>
            </article>
          )}
        </div>
      </main>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Contact {registrar?.full_name || "Registrar"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Your request will be sent to {registrar?.full_name}. Their contact
              details remain private until they accept your request.
            </p>
            <Textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Introduce yourself and describe what you need help with..."
              rows={4}
              className="resize-none"
            />
            <Button
              onClick={handleSendInquiry}
              disabled={sending}
              className="w-full gap-1.5"
            >
              {sending ? "Sending..." : "Send inquiry"}
              {!sending && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrarProfile;
