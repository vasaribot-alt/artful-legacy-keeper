import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShieldCheck, Clock, Loader2, CheckCircle, XCircle,
  ChevronDown, ChevronRight, Trash2, Award,
} from "lucide-react";

interface Application {
  id: string;
  user_id: string;
  credentials: string | null;
  experience_summary: string | null;
  years_experience: number | null;
  specializations: string[];
  languages: string[];
  geographic_coverage: string | null;
  professional_statement: string | null;
  references_json: any[];
  arcs_member: boolean;
  arcs_member_id: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_avatar: string | null;
  applicant_city: string | null;
  applicant_country: string | null;
}

interface VerifiedRegistrar {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  specializations: string[];
  languages: string[];
  is_listed: boolean;
  is_verified: boolean;
}

const FoundationRegistrars = () => {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [verified, setVerified] = useState<VerifiedRegistrar[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionDialog, setActionDialog] = useState<{ app: Application; action: "approve" | "decline" } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchApplications(), fetchVerified()]);
    setLoading(false);
  };

  const fetchApplications = async () => {
    const { data: apps, error } = await supabase
      .from("registrar_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !apps) {
      console.error("Failed to load applications:", error);
      return;
    }

    // Fetch applicant profiles
    const userIds = [...new Set(apps.map((a) => a.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, avatar_url, city, country")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    const enriched: Application[] = apps.map((app) => {
      const p = profileMap.get(app.user_id) || {} as any;
      return {
        ...app,
        applicant_name: p.full_name || null,
        applicant_email: p.email || null,
        applicant_avatar: p.avatar_url || null,
        applicant_city: p.city || null,
        applicant_country: p.country || null,
      };
    });

    setApplications(enriched);
  };

  const fetchVerified = async () => {
    const { data, error } = await supabase
      .from("registrar_profiles")
      .select(`
        user_id, is_listed, is_verified, specializations, languages
      `)
      .eq("is_verified", true);

    if (error || !data) {
      console.error("Failed to load verified registrars:", error);
      return;
    }

    const userIds = data.map((r) => r.user_id);
    if (userIds.length === 0) {
      setVerified([]);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, city, country")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    const enriched: VerifiedRegistrar[] = data.map((rp) => {
      const p = profileMap.get(rp.user_id) || {} as any;
      return {
        user_id: rp.user_id,
        full_name: p.full_name || null,
        avatar_url: p.avatar_url || null,
        city: p.city || null,
        country: p.country || null,
        specializations: rp.specializations || [],
        languages: rp.languages || [],
        is_listed: rp.is_listed,
        is_verified: rp.is_verified,
      };
    });

    setVerified(enriched);
  };

  const handleApprove = async (app: Application) => {
    setReviewing(app.id);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("registrar_applications")
      .update({
        status: "approved",
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes.trim() || null,
      })
      .eq("id", app.id);

    if (error) {
      toast.error("Failed to approve application");
      console.error(error);
    } else {
      toast.success(`${app.applicant_name || "Registrar"} verified and listed`);
      setActionDialog(null);
      setReviewNotes("");
      fetchData();
    }
    setReviewing(null);
  };

  const handleDecline = async (app: Application) => {
    setReviewing(app.id);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("registrar_applications")
      .update({
        status: "declined",
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes.trim() || null,
      })
      .eq("id", app.id);

    if (error) {
      toast.error("Failed to decline application");
      console.error(error);
    } else {
      toast.success("Application declined");
      setActionDialog(null);
      setReviewNotes("");
      fetchData();
    }
    setReviewing(null);
  };

  const handleRevoke = async (userId: string) => {
    const { error } = await supabase
      .from("registrar_profiles")
      .update({
        is_verified: false,
        is_listed: false,
      })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to revoke verification");
    } else {
      toast.success("Verification revoked");
      fetchVerified();
    }
  };

  const handleRelist = async (userId: string) => {
    const { error } = await supabase
      .from("registrar_profiles")
      .update({ is_listed: true })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to re-list registrar");
    } else {
      toast.success("Registrar re-listed");
      fetchVerified();
    }
  };

  const pendingApps = applications.filter((a) => a.status === "pending" || a.status === "under_review");
  const reviewedApps = applications.filter((a) => a.status === "approved" || a.status === "declined");

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-xs gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case "under_review":
        return <Badge variant="outline" className="text-xs gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Under Review</Badge>;
      case "approved":
        return <Badge className="text-xs gap-1 bg-primary"><CheckCircle className="w-3 h-3" /> Approved</Badge>;
      case "declined":
        return <Badge variant="outline" className="text-xs gap-1 text-destructive"><XCircle className="w-3 h-3" /> Declined</Badge>;
      default:
        return null;
    }
  };

  return (
    <AppLayout title="Registrar Registry">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {/* Pending Applications */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pending Applications
            {pendingApps.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-foreground text-background">
                {pendingApps.length}
              </span>
            )}
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : pendingApps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No pending applications.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingApps.map((app) => (
                <div
                  key={app.id}
                  className="rounded-sm border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 rounded-sm">
                        {app.applicant_avatar && (
                          <AvatarImage src={app.applicant_avatar} alt={app.applicant_name || ""} />
                        )}
                        <AvatarFallback className="rounded-sm bg-secondary">
                          {app.applicant_name?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{app.applicant_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.applicant_email}
                          {app.applicant_city && ` · ${app.applicant_city}`}
                          {app.applicant_country && `, ${app.applicant_country}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusBadge(app.status)}
                      {expandedId === app.id ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedId === app.id && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      {app.credentials && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Credentials</p>
                          <p className="text-sm">{app.credentials}</p>
                        </div>
                      )}
                      {app.experience_summary && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Experience</p>
                          <p className="text-sm">{app.experience_summary}</p>
                        </div>
                      )}
                      {app.years_experience != null && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Years of experience</p>
                          <p className="text-sm">{app.years_experience}</p>
                        </div>
                      )}
                      {app.specializations?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Specializations</p>
                          <div className="flex flex-wrap gap-1.5">
                            {app.specializations.map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs font-normal">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {app.languages?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Languages</p>
                          <p className="text-sm">{app.languages.join(", ")}</p>
                        </div>
                      )}
                      {app.geographic_coverage && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Geographic coverage</p>
                          <p className="text-sm">{app.geographic_coverage}</p>
                        </div>
                      )}
                      {app.professional_statement && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Professional statement</p>
                          <p className="text-sm">{app.professional_statement}</p>
                        </div>
                      )}
                      {app.references_json && app.references_json.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">References</p>
                          <div className="space-y-1.5">
                            {app.references_json.map((ref: any, i: number) => (
                              <div key={i} className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{ref.name}</span>
                                {ref.institution && `, ${ref.institution}`}
                                {ref.email && ` · ${ref.email}`}
                                {ref.relationship && ` · ${ref.relationship}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {app.arcs_member && (
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-primary" />
                          <span className="text-sm font-medium">ARCS Member</span>
                          {app.arcs_member_id && (
                            <span className="text-xs text-muted-foreground">#{app.arcs_member_id}</span>
                          )}
                        </div>
                      )}

                      {/* Review actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setActionDialog({ app, action: "approve" });
                            setReviewNotes("");
                          }}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-destructive"
                          onClick={() => {
                            setActionDialog({ app, action: "decline" });
                            setReviewNotes("");
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Verified Registrars */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Verified Registrars
            {verified.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-foreground text-background">
                {verified.length}
              </span>
            )}
          </h2>

          {verified.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No verified registrars yet.
            </p>
          ) : (
            <div className="space-y-2">
              {verified.map((reg) => (
                <div
                  key={reg.user_id}
                  className="flex items-center justify-between p-3 rounded-sm border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 rounded-sm">
                      {reg.avatar_url && (
                        <AvatarImage src={reg.avatar_url} alt={reg.full_name || ""} />
                      )}
                      <AvatarFallback className="rounded-sm bg-secondary text-xs">
                        {reg.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{reg.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">
                        {reg.specializations?.join(", ") || "General"}
                        {reg.city && ` · ${reg.city}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!reg.is_listed && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleRelist(reg.user_id)}
                      >
                        Re-list
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive gap-1"
                      onClick={() => handleRevoke(reg.user_id)}
                    >
                      <Trash2 className="w-3 h-3" /> Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reviewed Applications History */}
        {reviewedApps.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              Review History
            </h2>
            <div className="space-y-2">
              {reviewedApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 rounded-sm border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 rounded-sm">
                      {app.applicant_avatar && (
                        <AvatarImage src={app.applicant_avatar} alt={app.applicant_name || ""} />
                      )}
                      <AvatarFallback className="rounded-sm bg-secondary text-xs">
                        {app.applicant_name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{app.applicant_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {statusBadge(app.status)}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Approve/Decline Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === "approve" ? "Approve Application" : "Decline Application"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {actionDialog?.action === "approve"
                ? `${actionDialog.app.applicant_name} will be marked as a verified registrar and listed in the public directory.`
                : `${actionDialog?.app.applicant_name}'s application will be declined. They can edit and resubmit.`}
            </p>
            <div>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Review notes (optional, shown to applicant if declined)..."
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setActionDialog(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-1.5"
                variant={actionDialog?.action === "approve" ? "default" : "outline"}
                disabled={!!reviewing}
                onClick={() => {
                  if (actionDialog?.action === "approve") {
                    handleApprove(actionDialog.app);
                  } else if (actionDialog?.action === "decline") {
                    handleDecline(actionDialog.app);
                  }
                }}
              >
                {reviewing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : actionDialog?.action === "approve" ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Approve</>
                ) : (
                  <><XCircle className="w-3.5 h-3.5" /> Decline</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default FoundationRegistrars;
