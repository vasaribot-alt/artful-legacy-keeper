import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
}

const RegistrarProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [registrar, setRegistrar] = useState<VerifiedRegistrar | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("get_verified_registrars");
      if (error) {
        console.error("Failed to load registrar:", error);
      } else {
        const match = (data as VerifiedRegistrar[] | null)?.find(
          (r) => r.user_id === userId
        );
        setRegistrar(match || null);
      }
      setLoading(false);
    })();
  }, [userId]);

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
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Global Artist Registry Foundation
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
              </section>

              {/* Contact */}
              <section className="pt-8 border-t border-border space-y-3">
                <Button onClick={openContact} className="gap-1.5">
                  <Mail className="w-4 h-4" /> Contact this registrar
                </Button>
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
