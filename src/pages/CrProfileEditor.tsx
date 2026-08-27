import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
import { CrCommitteeManager } from "@/components/CrCommitteeManager";

interface CrFields {
  cr_listed: boolean;
  birth_city: string;
  birth_country: string;
  death_country: string;
  nationality: string;
  period_activity_start: string;
  period_activity_end: string;
  cr_status: string;
  cr_scope: string;
  cr_compilers: string;
  cr_sponsor: string;
  cr_contact_email: string;
  cr_website_url: string;
  cr_first_volume_year: string;
  cr_publisher: string;
  cr_isbn: string;
}

interface EditableProfile {
  user_id: string;
  full_name: string | null;
  global_artist_id: number | null;
  relation: "author" | "committee";
}

const EMPTY: CrFields = {
  cr_listed: false,
  birth_city: "",
  birth_country: "",
  death_country: "",
  nationality: "",
  period_activity_start: "",
  period_activity_end: "",
  cr_status: "in_preparation",
  cr_scope: "",
  cr_compilers: "",
  cr_sponsor: "",
  cr_contact_email: "",
  cr_website_url: "",
  cr_first_volume_year: "",
  cr_publisher: "",
  cr_isbn: "",
};

export default function CrProfileEditor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<EditableProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [gar, setGar] = useState<number | null>(null);
  const [f, setF] = useState<CrFields>(EMPTY);

  // Step 1: build the list of profiles the user can edit (author + committee)
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const list: EditableProfile[] = [];

      // Author: own profile
      const { data: own } = await supabase
        .from("profiles")
        .select("user_id, full_name, global_artist_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (own) {
        list.push({
          user_id: own.user_id,
          full_name: own.full_name,
          global_artist_id: own.global_artist_id,
          relation: "author",
        });
      }

      // Committee: profiles where the current user has registrar access
      const { data: access } = await supabase
        .from("registrar_access")
        .select("owner_id")
        .eq("registrar_id", session.user.id)
        .eq("status", "approved");

      const ownerIds = (access || [])
        .map((r: { owner_id: string }) => r.owner_id)
        .filter((id) => id !== session.user.id);

      if (ownerIds.length > 0) {
        const { data: granted } = await supabase
          .from("profiles")
          .select("user_id, full_name, global_artist_id")
          .in("user_id", ownerIds);
        (granted || []).forEach((p) =>
          list.push({
            user_id: p.user_id,
            full_name: p.full_name,
            global_artist_id: p.global_artist_id,
            relation: "committee",
          })
        );
      }

      setProfiles(list);
      if (list.length > 0) {
        setActiveId(list[0].user_id);
      } else {
        setLoading(false);
      }
    })();
  }, [navigate]);

  // Step 2: load CR fields for the active profile
  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "global_artist_id, cr_listed, birth_city, birth_country, death_country, nationality, period_activity_start, period_activity_end, cr_status, cr_scope, cr_compilers, cr_sponsor, cr_contact_email, cr_website_url, cr_first_volume_year, cr_publisher, cr_isbn"
        )
        .eq("user_id", activeId)
        .maybeSingle();
      if (data) {
        setGar((data as { global_artist_id: number }).global_artist_id);
        setF({
          cr_listed: !!data.cr_listed,
          birth_city: data.birth_city ?? "",
          birth_country: data.birth_country ?? "",
          death_country: data.death_country ?? "",
          nationality: data.nationality ?? "",
          period_activity_start: data.period_activity_start?.toString() ?? "",
          period_activity_end: data.period_activity_end?.toString() ?? "",
          cr_status: data.cr_status ?? "in_preparation",
          cr_scope: data.cr_scope ?? "",
          cr_compilers: data.cr_compilers ?? "",
          cr_sponsor: data.cr_sponsor ?? "",
          cr_contact_email: data.cr_contact_email ?? "",
          cr_website_url: data.cr_website_url ?? "",
          cr_first_volume_year: data.cr_first_volume_year?.toString() ?? "",
          cr_publisher: data.cr_publisher ?? "",
          cr_isbn: data.cr_isbn ?? "",
        });
      } else {
        setF(EMPTY);
        setGar(null);
      }
      setLoading(false);
    })();
  }, [activeId]);

  const setField = <K extends keyof CrFields>(k: K, v: CrFields[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!activeId) return;
    setSaving(true);
    const toInt = (s: string) => (s.trim() === "" ? null : parseInt(s, 10));
    const { error } = await supabase
      .from("profiles")
      .update({
        cr_listed: f.cr_listed,
        birth_city: f.birth_city || null,
        birth_country: f.birth_country || null,
        death_country: f.death_country || null,
        nationality: f.nationality || null,
        period_activity_start: toInt(f.period_activity_start),
        period_activity_end: toInt(f.period_activity_end),
        cr_status: f.cr_status || null,
        cr_scope: f.cr_scope || null,
        cr_compilers: f.cr_compilers || null,
        cr_sponsor: f.cr_sponsor || null,
        cr_contact_email: f.cr_contact_email || null,
        cr_website_url: f.cr_website_url || null,
        cr_first_volume_year: toInt(f.cr_first_volume_year),
        cr_publisher: f.cr_publisher || null,
        cr_isbn: f.cr_isbn || null,
      })
      .eq("user_id", activeId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Catalogue Raisonné profile saved");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (profiles.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <h1 className="font-serif text-3xl mb-3">
            Catalogue Raisonné Profile
          </h1>
          <p className="text-muted-foreground">
            You don't have access to any artist profile yet. To edit a CR
            profile you must either be the artist (author) or hold approved
            committee access via the registrar system.
          </p>
        </div>
      </AppLayout>
    );
  }

  const active = profiles.find((p) => p.user_id === activeId);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Public Directory
          </p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">
            Catalogue Raisonné Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-3">
            Scholarly entry for the public CR directory at <code>/cr</code>.
            Editable by the artist (author) and by approved committee members.
          </p>
        </header>

        {profiles.length > 1 && (
          <section className="space-y-2">
            <Label>Editing profile for</Label>
            <Select
              value={activeId ?? undefined}
              onValueChange={(v) => setActiveId(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name || "Untitled"}
                    {p.global_artist_id ? ` · GAR-${p.global_artist_id}` : ""}
                    {p.relation === "author" ? " · author" : " · committee"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        )}

        {active && (
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Your role on this profile:{" "}
            <span className="text-foreground">{active.relation}</span>
          </p>
        )}

        <section className="border rounded-md p-5 flex items-center justify-between">
          <div>
            <div className="font-medium">List in the public directory</div>
            <p className="text-sm text-muted-foreground">
              When enabled, this profile appears at{" "}
              <code>/cr/artist/{gar ?? "—"}</code>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {gar && f.cr_listed && (
              <a
                href={`/cr/artist/${gar}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm inline-flex items-center gap-1 underline text-muted-foreground"
              >
                View <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <Switch
              checked={f.cr_listed}
              onCheckedChange={(v) => setField("cr_listed", v)}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Artist
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Place of birth (city)"
              value={f.birth_city}
              onChange={(v) => setField("birth_city", v)}
            />
            <Field
              label="Country of birth"
              value={f.birth_country}
              onChange={(v) => setField("birth_country", v)}
            />
            <Field
              label="Country of death"
              value={f.death_country}
              onChange={(v) => setField("death_country", v)}
            />
            <Field
              label="Nationality"
              value={f.nationality}
              onChange={(v) => setField("nationality", v)}
              placeholder="e.g. French"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Active from"
                value={f.period_activity_start}
                onChange={(v) => setField("period_activity_start", v)}
                placeholder="1950"
              />
              <Field
                label="Active to"
                value={f.period_activity_end}
                onChange={(v) => setField("period_activity_end", v)}
                placeholder="present"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Catalogue Raisonné
          </h2>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={f.cr_status}
              onValueChange={(v) => setField("cr_status", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_preparation">In Preparation</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="digital_only">Online only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Scope</Label>
            <Textarea
              rows={2}
              value={f.cr_scope}
              onChange={(e) => setField("cr_scope", e.target.value)}
              placeholder="e.g. Paintings, 1955–2010"
            />
          </div>

          <Field
            label="Compilers / Authors"
            value={f.cr_compilers}
            onChange={(v) => setField("cr_compilers", v)}
            placeholder="e.g. Smith, J.; Jones, K."
          />

          <Field
            label="Sponsoring foundation"
            value={f.cr_sponsor}
            onChange={(v) => setField("cr_sponsor", v)}
            placeholder="e.g. The Raisonné Foundation"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Scholarly contact email"
              value={f.cr_contact_email}
              onChange={(v) => setField("cr_contact_email", v)}
              placeholder="cr@example.org"
            />
            <Field
              label="Online CR URL"
              value={f.cr_website_url}
              onChange={(v) => setField("cr_website_url", v)}
              placeholder="https://"
            />
            <Field
              label="First volume year"
              value={f.cr_first_volume_year}
              onChange={(v) => setField("cr_first_volume_year", v)}
              placeholder="2018"
            />
            <Field
              label="Publisher"
              value={f.cr_publisher}
              onChange={(v) => setField("cr_publisher", v)}
            />
            <Field
              label="ISBN"
              value={f.cr_isbn}
              onChange={(v) => setField("cr_isbn", v)}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Committee
          </h2>
          <p className="text-sm text-muted-foreground">
            Add the author of the catalogue raisonné and any committee members.
            The list appears on the public scholarly page.
          </p>
          {activeId && <CrCommitteeManager artistUserId={activeId} />}
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}
