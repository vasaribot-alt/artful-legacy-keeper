import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ExternalLink, Mail } from "lucide-react";

interface Profile {
  user_id: string;
  global_artist_id: number;
  full_name: string | null;
  biography: string | null;
  birth_year: number | null;
  birth_country: string | null;
  death_year: number | null;
  death_country: string | null;
  nationality: string | null;
  period_activity_start: number | null;
  period_activity_end: number | null;
  cr_status: string | null;
  cr_scope: string | null;
  cr_compilers: string | null;
  cr_sponsor: string | null;
  cr_contact_email: string | null;
  cr_website_url: string | null;
  cr_first_volume_year: number | null;
  cr_publisher: string | null;
  cr_isbn: string | null;
  avatar_url: string | null;
}

interface CvEntry {
  id: string;
  section: string;
  year: string | null;
  entry_text: string;
}

interface Member {
  id: string;
  name: string;
  email: string | null;
  role: string;
  affiliation: string | null;
  sort_order: number;
}

const MEMBER_ROLE_LABEL: Record<string, string> = {
  author: "Author",
  committee_chair: "Committee Chair",
  committee_member: "Committee Member",
};

const STATUS_LABEL: Record<string, string> = {
  published: "Published",
  in_preparation: "In Preparation",
  digital_only: "Online",
};

export default function CrArtistProfile() {
  const { gar } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cv, setCv] = useState<CvEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      if (!gar) return;
      let query = supabase.from("profiles").select("*").eq("cr_listed", true).limit(1);
      // numeric GAR or UUID
      if (/^\d+$/.test(gar)) {
        query = query.eq("global_artist_id", Number(gar));
      } else {
        query = query.eq("user_id", gar);
      }
      const { data } = await query.maybeSingle();
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(data as unknown as Profile);
      const { data: cvData } = await supabase
        .from("cv_entries")
        .select("id, section, year, entry_text")
        .eq("profile_id", (data as { id: string }).id)
        .order("year", { ascending: false });
      setCv((cvData as CvEntry[]) || []);
      setLoading(false);
    })();
  }, [gar]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <h1 className="font-serif text-3xl">Not in the directory</h1>
        <p className="text-muted-foreground">
          This artist's catalogue raisonné is not yet listed.
        </p>
        <Link to="/cr" className="underline text-sm">
          Back to the directory
        </Link>
      </div>
    );
  }

  const lifeLine = [
    profile.birth_year &&
      `b. ${profile.birth_year}${profile.birth_country ? `, ${profile.birth_country}` : ""}`,
    profile.death_year &&
      `d. ${profile.death_year}${profile.death_country ? `, ${profile.death_country}` : ""}`,
  ]
    .filter(Boolean)
    .join(" — ");

  const meta = [
    profile.nationality,
    profile.period_activity_start &&
      `Active ${profile.period_activity_start}–${profile.period_activity_end ?? "present"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const cvBySection = cv.reduce<Record<string, CvEntry[]>>((acc, e) => {
    (acc[e.section] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Link
            to="/cr"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Directory
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        <section>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight">
            {profile.full_name}
          </h1>
          {lifeLine && (
            <p className="text-muted-foreground mt-3">{lifeLine}</p>
          )}
          {meta && (
            <p className="text-sm text-muted-foreground mt-1">{meta}</p>
          )}
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mt-4">
            GAR-{String(profile.global_artist_id).padStart(8, "0")}
          </p>
        </section>

        <section className="border-t border-b py-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Catalogue Raisonné
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-y-3 gap-x-6 text-sm">
            <CRRow
              label="Status"
              value={STATUS_LABEL[profile.cr_status || ""] || "In Preparation"}
            />
            <CRRow label="Scope" value={profile.cr_scope} />
            <CRRow label="Compilers" value={profile.cr_compilers} />
            <CRRow label="Sponsor" value={profile.cr_sponsor} />
            <CRRow label="Publisher" value={profile.cr_publisher} />
            <CRRow
              label="First volume"
              value={profile.cr_first_volume_year?.toString()}
            />
            <CRRow label="ISBN" value={profile.cr_isbn} />
            {profile.cr_contact_email && (
              <CRRow
                label="Contact"
                value={
                  <a
                    href={`mailto:${profile.cr_contact_email}`}
                    className="inline-flex items-center gap-1 underline"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {profile.cr_contact_email}
                  </a>
                }
              />
            )}
            {profile.cr_website_url && (
              <CRRow
                label="Online"
                value={
                  <a
                    href={profile.cr_website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {profile.cr_website_url.replace(/^https?:\/\//, "")}
                  </a>
                }
              />
            )}
          </dl>
        </section>

        {profile.biography && (
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Biography
            </h2>
            <p className="whitespace-pre-wrap leading-relaxed">
              {profile.biography}
            </p>
          </section>
        )}

        {Object.keys(cvBySection).length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Chronology
            </h2>
            <div className="space-y-6">
              {Object.entries(cvBySection).map(([section, entries]) => (
                <div key={section}>
                  <h3 className="font-serif text-lg mb-2">{section}</h3>
                  <ul className="space-y-1.5 text-sm">
                    {entries.map((e) => (
                      <li key={e.id} className="grid grid-cols-[4rem_1fr] gap-3">
                        <span className="text-muted-foreground">
                          {e.year || ""}
                        </span>
                        <span>{e.entry_text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>

      <footer className="border-t mt-16 py-8 text-center text-xs text-muted-foreground">
        The Raisonné · theraisonne.org
      </footer>
    </div>
  );
}

function CRRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode | string | null | undefined;
}) {
  if (!value) return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
