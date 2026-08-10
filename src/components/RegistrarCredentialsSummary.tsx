import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Clock, Pencil, ShieldQuestion } from "lucide-react";

interface RegProfile {
  specializations: string[] | null;
  credentials: string | null;
  years_experience: number | null;
  languages: string[] | null;
  geographic_coverage: string | null;
  professional_statement: string | null;
  is_listed: boolean;
  is_verified: boolean;
  arcs_member: boolean;
  arcs_member_id: string | null;
}

export function RegistrarCredentialsSummary() {
  const [profile, setProfile] = useState<RegProfile | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const [{ data: rp }, { data: app }] = await Promise.all([
        supabase
          .from("registrar_profiles")
          .select(
            "specializations, credentials, years_experience, languages, geographic_coverage, professional_statement, is_listed, is_verified, arcs_member, arcs_member_id"
          )
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("registrar_applications")
          .select("status")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setProfile((rp as RegProfile) || null);
      setApplicationStatus((app as { status: string } | null)?.status ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  if (!profile) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl">Professional Credentials</h2>
        <div className="p-5 border border-border rounded-sm bg-secondary/30 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            {applicationStatus === "pending" ? (
              <>
                <Clock className="w-4 h-4" />
                <span>Your verification application is under review.</span>
              </>
            ) : (
              <>
                <ShieldQuestion className="w-4 h-4" />
                <span>
                  You have not submitted your professional credentials yet.
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Verified registrars appear in the public registrar directory, where
            artists and collectors can find you.
          </p>
          {applicationStatus !== "pending" && (
            <Button asChild size="sm" variant="outline">
              <Link to="/registrar/apply">Get verified</Link>
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl">Professional Credentials</h2>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link to="/registrar/apply">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Link>
        </Button>
      </div>

      <div className="p-5 border border-border rounded-sm space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {profile.is_verified ? (
            <Badge variant="secondary" className="gap-1">
              <BadgeCheck className="w-3.5 h-3.5" /> Verified registrar
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3.5 h-3.5" /> Pending verification
            </Badge>
          )}
          <Badge variant="outline">
            {profile.is_listed ? "Listed in directory" : "Not listed"}
          </Badge>
          {profile.arcs_member && (
            <Badge variant="outline">
              ARCS member{profile.arcs_member_id ? ` · ${profile.arcs_member_id}` : ""}
            </Badge>
          )}
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-y-3 gap-x-6 text-sm">
          <Row
            label="Experience"
            value={
              profile.years_experience
                ? `${profile.years_experience} years`
                : null
            }
          />
          <Row label="Credentials" value={profile.credentials} />
          <Row
            label="Specializations"
            value={profile.specializations?.join(", ") || null}
          />
          <Row label="Languages" value={profile.languages?.join(", ") || null} />
          <Row label="Coverage" value={profile.geographic_coverage} />
        </dl>

        {profile.professional_statement && (
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Professional statement
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {profile.professional_statement}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
