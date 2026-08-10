import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ShieldCheck, Globe, Languages, MapPin, ArrowRight, Mail } from "lucide-react";
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
  years_experience: number | null;
  arcs_member: boolean;
}

const RegistrarsDirectory = () => {
  const navigate = useNavigate();
  const [registrars, setRegistrars] = useState<VerifiedRegistrar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [contactTarget, setContactTarget] = useState<VerifiedRegistrar | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchRegistrars();
  }, []);

  const fetchRegistrars = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_verified_registrars");
    if (error) {
      console.error("Failed to load registrars:", error);
    } else {
      setRegistrars(data || []);
    }
    setLoading(false);
  };

  const handleContactClick = async (registrar: VerifiedRegistrar) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.info("Please sign in to contact a registrar");
      navigate("/login");
      return;
    }
    setContactTarget(registrar);
    setContactMessage("");
  };

  const handleSendInquiry = async () => {
    if (!contactTarget) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Session expired");
      setSending(false);
      return;
    }

    const { error } = await supabase.from("registrar_access").insert({
      owner_id: user.id,
      registrar_id: contactTarget.user_id,
      requested_by: "owner",
      status: "pending",
      message: contactMessage.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.info("You already have a pending request with this registrar");
      } else {
        toast.error("Failed to send inquiry");
      }
    } else {
      toast.success("Inquiry sent! The registrar will review your request.");
      setContactTarget(null);
      setContactMessage("");
    }
    setSending(false);
  };

  const filtered = registrars.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(q) ||
      r.specializations.some((s) => s.toLowerCase().includes(q)) ||
      r.languages.some((l) => l.toLowerCase().includes(q)) ||
      r.geographic_coverage?.toLowerCase().includes(q) ||
      r.city?.toLowerCase().includes(q) ||
      r.country?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Global Artist Registry Foundation
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/founding-artists" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Artists
            </Link>
            <span className="text-sm font-medium">Registrars</span>
            <Link to="/donors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Supporters
            </Link>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Verified Professionals
          </p>
          <h1 className="text-4xl md:text-5xl leading-[1.1] mb-6 text-balance">
            Registrar Directory
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Foundation-verified registrars for catalogue raisonné, provenance research,
            and collections documentation. Contact a registrar directly through GARF.
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="px-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, specialization, language, or region..."
              className="pl-10 h-11"
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {filtered.length} verified registrar{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {registrars.length === 0
                  ? "No verified registrars yet"
                  : "No matching registrars found"}
              </p>
              {registrars.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Registrars can apply for verification from their dashboard.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((registrar) => (
                <div
                  key={registrar.user_id}
                  className="p-6 rounded-sm border border-border hover:border-foreground/20 transition-colors bg-card flex flex-col"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="w-14 h-14 rounded-sm">
                      {registrar.avatar_url && (
                        <AvatarImage src={registrar.avatar_url} alt={registrar.full_name || ""} />
                      )}
                      <AvatarFallback className="rounded-sm bg-secondary text-lg">
                        {registrar.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-base truncate">
                          {registrar.full_name || "Unnamed"}
                        </h3>
                        <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                      </div>
                      {registrar.city && registrar.country && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {registrar.city}, {registrar.country}
                        </p>
                      )}
                      {registrar.years_experience != null && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {registrar.years_experience} year{registrar.years_experience !== 1 ? "s" : ""} experience
                        </p>
                      )}
                    </div>
                  </div>

                  {registrar.professional_statement && (
                    <p className="text-sm text-muted-foreground mt-4 line-clamp-3 leading-relaxed">
                      {registrar.professional_statement}
                    </p>
                  )}

                  {registrar.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {registrar.specializations.map((spec) => (
                        <Badge key={spec} variant="secondary" className="text-xs font-normal">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    {registrar.languages.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Languages className="w-3 h-3" />
                        {registrar.languages.join(", ")}
                      </span>
                    )}
                    {registrar.geographic_coverage && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {registrar.geographic_coverage}
                      </span>
                    )}
                    {registrar.arcs_member && (
                      <span className="flex items-center gap-1 text-primary">
                        <ShieldCheck className="w-3 h-3" />
                        ARCS Member
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 w-full"
                      onClick={() => handleContactClick(registrar)}
                    >
                      <Mail className="w-3.5 h-3.5" /> Contact this registrar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact Dialog */}
      <Dialog open={!!contactTarget} onOpenChange={(open) => !open && setContactTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Contact {contactTarget?.full_name || "Registrar"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Your request will be sent to {contactTarget?.full_name}. Their contact details
              remain private until they accept your request.
            </p>
            <div>
              <Textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Introduce yourself and describe what you need help with..."
                rows={4}
                className="resize-none"
              />
            </div>
            <Button onClick={handleSendInquiry} disabled={sending} className="w-full gap-1.5">
              {sending ? "Sending..." : "Send inquiry"}
              {!sending && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrarsDirectory;
