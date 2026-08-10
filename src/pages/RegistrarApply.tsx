import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Clock, CheckCircle, XCircle, Loader2, Plus, Trash2, Award } from "lucide-react";

interface Application {
  id: string;
  status: string;
  credentials: string | null;
  experience_summary: string | null;
  years_experience: number | null;
  specializations: string[];
  languages: string[];
  geographic_coverage: string | null;
  professional_statement: string | null;
  references_json: any;
  arcs_member: boolean;
  arcs_member_id: string | null;
  review_notes: string | null;
  created_at: string;
}

interface Reference {
  name: string;
  institution: string;
  email: string;
  relationship: string;
}

const SPECIALIZATION_OPTIONS = [
  "Contemporary", "Modern", "Old Masters", "Photography", "Sculpture",
  "Prints & Editions", "Digital Art", "Installation", "Painting", "Drawing",
  "Decorative Arts", "Antiquities", "Asian Art", "Indigenous Art",
];

const LANGUAGE_OPTIONS = [
  "English", "Norwegian", "Danish", "Swedish", "German", "French",
  "Italian", "Spanish", "Dutch", "Japanese", "Chinese", "Portuguese",
];

const RegistrarApply = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [hasRegistrarRole, setHasRegistrarRole] = useState(false);

  // Form state
  const [credentials, setCredentials] = useState("");
  const [experienceSummary, setExperienceSummary] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [geographicCoverage, setGeographicCoverage] = useState("");
  const [professionalStatement, setProfessionalStatement] = useState("");
  const [references, setReferences] = useState<Reference[]>([
    { name: "", institution: "", email: "", relationship: "" },
  ]);
  const [arcsMember, setArcsMember] = useState(false);
  const [arcsMemberId, setArcsMemberId] = useState("");

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: roleData } = await (supabase as any).rpc("has_role", {
      _user_id: user.id,
      _role: "registrar",
    });

    if (!roleData) {
      toast.error("Only registrars can apply for verification");
      navigate("/registrar");
      return;
    }

    setHasRegistrarRole(true);

    // Check for existing application
    const { data: existing } = await supabase
      .from("registrar_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      setExistingApp(existing as Application);
      setCredentials(existing.credentials || "");
      setExperienceSummary(existing.experience_summary || "");
      setYearsExperience(existing.years_experience?.toString() || "");
      setSpecializations(existing.specializations || []);
      setLanguages(existing.languages || []);
      setGeographicCoverage(existing.geographic_coverage || "");
      setProfessionalStatement(existing.professional_statement || "");
      const refs = (existing.references_json as unknown) as Reference[];
      setReferences(
        refs?.length
          ? refs
          : [{ name: "", institution: "", email: "", relationship: "" }]
      );
      setArcsMember(existing.arcs_member || false);
      setArcsMemberId(existing.arcs_member_id || "");
    }

    setLoading(false);
  };

  const toggleArrayItem = (arr: string[], item: string): string[] => {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  };

  const addReference = () => {
    setReferences([...references, { name: "", institution: "", email: "", relationship: "" }]);
  };

  const removeReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index));
  };

  const updateReference = (index: number, field: keyof Reference, value: string) => {
    setReferences(references.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async () => {
    if (!credentials.trim()) {
      toast.error("Please describe your credentials");
      return;
    }
    if (specializations.length === 0) {
      toast.error("Please select at least one specialization");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Session expired");
      setSaving(false);
      return;
    }

    const cleanReferences = references.filter((r) => r.name.trim());

    const payload = {
      user_id: user.id,
      credentials: credentials.trim(),
      experience_summary: experienceSummary.trim() || null,
      years_experience: yearsExperience ? parseInt(yearsExperience) : null,
      specializations,
      languages,
      geographic_coverage: geographicCoverage.trim() || null,
      professional_statement: professionalStatement.trim() || null,
      references_json: JSON.stringify(cleanReferences),
      arcs_member: arcsMember,
      arcs_member_id: arcsMember ? arcsMemberId.trim() || null : null,
      status: "pending",
    };

    let error;
    if (existingApp) {
      // Resubmit: update existing application back to pending
      ({ error } = await supabase
        .from("registrar_applications")
        .update({
          ...payload,
          reviewed_by: null,
          reviewed_at: null,
          review_notes: null,
        })
        .eq("id", existingApp.id));
    } else {
      ({ error } = await supabase
        .from("registrar_applications")
        .insert(payload));
    }

    if (error) {
      toast.error("Failed to submit application");
      console.error(error);
    } else {
      toast.success("Application submitted!");
      checkAccess(); // Reload to show updated status
    }
    setSaving(false);
  };

  if (!hasRegistrarRole || loading) {
    return (
      <AppLayout title="Get Verified">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const isReadOnly = existingApp?.status === "pending" || existingApp?.status === "under_review";

  return (
    <AppLayout title="Get Verified">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Status banner */}
        {existingApp && (
          <div className="mb-8 p-4 rounded-sm border border-border bg-secondary/50">
            <div className="flex items-center gap-2 mb-1">
              {existingApp.status === "pending" && <Clock className="w-4 h-4 text-muted-foreground" />}
              {existingApp.status === "under_review" && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
              {existingApp.status === "approved" && <CheckCircle className="w-4 h-4 text-primary" />}
              {existingApp.status === "declined" && <XCircle className="w-4 h-4 text-destructive" />}
              <span className="text-sm font-medium capitalize">
                {existingApp.status === "under_review" ? "Under Review" : existingApp.status}
              </span>
            </div>
            {existingApp.status === "approved" && (
              <p className="text-xs text-muted-foreground">
                Your verification has been approved. You are listed in the public directory.
              </p>
            )}
            {existingApp.status === "declined" && existingApp.review_notes && (
              <p className="text-xs text-muted-foreground mt-2">
                <span className="font-medium">Foundation notes:</span> {existingApp.review_notes}
              </p>
            )}
            {(existingApp.status === "pending" || existingApp.status === "under_review") && (
              <p className="text-xs text-muted-foreground">
                Your application is being reviewed by the Foundation. You can edit and resubmit if needed.
              </p>
            )}
          </div>
        )}

        {/* Info banner */}
        {!existingApp && (
          <div className="mb-8 p-4 rounded-sm border border-border bg-secondary/30">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Apply for Verified Registrar Status</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Verified registrars appear in the public GARF directory where artists and collectors
                  can find and contact them. The Foundation reviews each application based on professional
                  credentials, experience, and references.
                </p>
              </div>
            </div>
          </div>
        )}

        {existingApp?.status === "approved" ? (
          <div className="text-center py-12">
            <ShieldCheck className="w-10 h-10 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">You're a Verified Registrar</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your profile is listed in the public directory. Artists and collectors can find you
              and send contact requests through GARF.
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
                Edit Profile
              </Button>
              <a
                href={`${window.location.origin}/registrars`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button variant="outline" size="sm">
                  View Directory
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Credentials */}
            <div>
              <Label htmlFor="credentials">
                Professional credentials <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="credentials"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                placeholder="Describe your formal training in art history, museum studies, archive management, or equivalent..."
                rows={3}
                className="mt-1.5 resize-none"
                readOnly={isReadOnly}
              />
            </div>

            {/* Experience */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="yearsExp">Years of experience</Label>
                <Input
                  id="yearsExp"
                  type="number"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="10"
                  className="mt-1.5"
                  readOnly={isReadOnly}
                />
              </div>
              <div>
                <Label htmlFor="geoCoverage">Geographic coverage</Label>
                <Input
                  id="geoCoverage"
                  value={geographicCoverage}
                  onChange={(e) => setGeographicCoverage(e.target.value)}
                  placeholder="Nordic countries, Europe, Worldwide..."
                  className="mt-1.5"
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="expSummary">Experience summary</Label>
              <Textarea
                id="expSummary"
                value={experienceSummary}
                onChange={(e) => setExperienceSummary(e.target.value)}
                placeholder="Institutions, project types, notable catalogue raisonné projects..."
                rows={3}
                className="mt-1.5 resize-none"
                readOnly={isReadOnly}
              />
            </div>

            {/* Specializations */}
            <div>
              <Label>Specializations <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SPECIALIZATION_OPTIONS.map((spec) => {
                  const selected = specializations.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setSpecializations(toggleArrayItem(specializations, spec))}
                      className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground/30"
                      } ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {spec}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Languages */}
            <div>
              <Label>Working languages</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const selected = languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setLanguages(toggleArrayItem(languages, lang))}
                      className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground/30"
                      } ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Professional statement */}
            <div>
              <Label htmlFor="statement">Professional statement</Label>
              <Textarea
                id="statement"
                value={professionalStatement}
                onChange={(e) => setProfessionalStatement(e.target.value)}
                placeholder="A short statement about your approach to documentation and collections care..."
                rows={3}
                className="mt-1.5 resize-none"
                readOnly={isReadOnly}
              />
            </div>

            {/* References */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Professional references</Label>
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addReference}
                    className="gap-1 h-7 text-xs"
                  >
                    <Plus className="w-3 h-3" /> Add reference
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {references.map((ref, i) => (
                  <div key={i} className="p-3 rounded-sm border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Reference {i + 1}</span>
                      {!isReadOnly && references.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReference(i)}
                          className="text-destructive hover:opacity-70"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={ref.name}
                        onChange={(e) => updateReference(i, "name", e.target.value)}
                        placeholder="Name"
                        className="h-8 text-sm"
                        readOnly={isReadOnly}
                      />
                      <Input
                        value={ref.institution}
                        onChange={(e) => updateReference(i, "institution", e.target.value)}
                        placeholder="Institution"
                        className="h-8 text-sm"
                        readOnly={isReadOnly}
                      />
                      <Input
                        value={ref.email}
                        onChange={(e) => updateReference(i, "email", e.target.value)}
                        placeholder="Email"
                        className="h-8 text-sm"
                        readOnly={isReadOnly}
                      />
                      <Input
                        value={ref.relationship}
                        onChange={(e) => updateReference(i, "relationship", e.target.value)}
                        placeholder="Relationship"
                        className="h-8 text-sm"
                        readOnly={isReadOnly}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ARCS membership */}
            <div className="p-4 rounded-sm border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">ARCS Membership</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Association of Registrars and Collections Specialists
                  </p>
                </div>
                <Switch
                  checked={arcsMember}
                  onCheckedChange={setArcsMember}
                  disabled={isReadOnly}
                />
              </div>
              {arcsMember && (
                <Input
                  value={arcsMemberId}
                  onChange={(e) => setArcsMemberId(e.target.value)}
                  placeholder="ARCS membership number (optional)"
                  className="mt-3"
                  readOnly={isReadOnly}
                />
              )}
            </div>

            {/* Submit */}
            {!isReadOnly && (
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </>
                ) : existingApp?.status === "declined" ? (
                  "Resubmit application"
                ) : (
                  <>
                    Submit application <ShieldCheck className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default RegistrarApply;
