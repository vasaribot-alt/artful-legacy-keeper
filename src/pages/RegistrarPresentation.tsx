import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RegistrarListingToggle } from "@/components/RegistrarListingToggle";
import { toast } from "sonner";
import {
  ArrowUp,
  ArrowDown,
  ExternalLink,
  GraduationCap,
  ImagePlus,
  Briefcase,
  Camera,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type Kind = "position" | "education" | "project";

interface EntryImage {
  id: string;
  storage_path: string;
  caption: string | null;
  credit: string | null;
  display_order: number;
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
  images?: EntryImage[];
}

interface ProfileForm {
  professional_statement: string;
  credentials: string;
  years_experience: string;
  nationality: string;
  education: string;
  geographic_coverage: string;
  specializations: string;
  languages: string;
  work_areas: string;
  cms_systems: string;
  available_for_freelance: boolean;
  availability_note: string;
  rate_indication: string;
  available_for_travel: boolean;
}

const EMPTY_FORM: ProfileForm = {
  professional_statement: "",
  credentials: "",
  years_experience: "",
  nationality: "",
  education: "",
  geographic_coverage: "",
  specializations: "",
  languages: "",
  work_areas: "",
  cms_systems: "",
  available_for_freelance: false,
  availability_note: "",
  rate_indication: "",
  available_for_travel: false,
};

const KIND_META: Record<Kind, { label: string; hint: string; icon: typeof Briefcase }> = {
  position: {
    label: "Career",
    hint: "Positions and engagements, most recent first.",
    icon: Briefcase,
  },
  education: {
    label: "Education",
    hint: "Degrees, institutes and professional training.",
    icon: GraduationCap,
  },
  project: {
    label: "Selected project work",
    hint: "Notable projects, with photographs and captions.",
    icon: Camera,
  },
};

const toList = (value: string) =>
  value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const RegistrarPresentation = () => {
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        navigate("/login");
        return;
      }
      setUid(user.id);

      const [{ data: rp }, { data: rows }] = await Promise.all([
        supabase
          .from("registrar_profiles")
          .select(
            "professional_statement, credentials, years_experience, nationality, education, geographic_coverage, specializations, languages, work_areas, cms_experience, is_verified, available_for_freelance, availability_note, rate_indication, available_for_travel"
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("registrar_entries")
          .select("*, registrar_entry_images(*)")
          .eq("user_id", user.id)
          .order("display_order", { ascending: true }),
      ]);

      if (rp) {
        const p = rp as any;
        setHasProfile(true);
        setIsVerified(!!p.is_verified);
        setForm({
          professional_statement: p.professional_statement || "",
          credentials: p.credentials || "",
          years_experience: p.years_experience != null ? String(p.years_experience) : "",
          nationality: p.nationality || "",
          education: p.education || "",
          geographic_coverage: p.geographic_coverage || "",
          specializations: (p.specializations || []).join(", "),
          languages: (p.languages || []).join(", "),
          work_areas: (p.work_areas || []).join(", "),
          cms_systems: Array.isArray(p.cms_experience)
            ? p.cms_experience.map((c: any) => c?.system).filter(Boolean).join(", ")
            : "",
          available_for_freelance: !!p.available_for_freelance,
          availability_note: p.availability_note || "",
          rate_indication: p.rate_indication || "",
          available_for_travel: !!p.available_for_travel,
        });
      }

      setEntries(
        ((rows as any[]) || []).map((r) => ({
          ...r,
          images: (r.registrar_entry_images || []).sort(
            (a: EntryImage, b: EntryImage) => a.display_order - b.display_order
          ),
        }))
      );
      setLoading(false);
    })();
  }, [navigate]);

  const publicUrl = (path: string) =>
    supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;

  const saveProfile = async () => {
    if (!uid) return;
    setSaving(true);
    const payload = {
      user_id: uid,
      professional_statement: form.professional_statement.trim() || null,
      credentials: form.credentials.trim() || null,
      years_experience: form.years_experience ? Number(form.years_experience) : null,
      nationality: form.nationality.trim() || null,
      education: form.education.trim() || null,
      geographic_coverage: form.geographic_coverage.trim() || null,
      specializations: toList(form.specializations),
      languages: toList(form.languages),
      work_areas: toList(form.work_areas),
      cms_experience: toList(form.cms_systems).map((system) => ({ system })),
      available_for_freelance: form.available_for_freelance,
      availability_note: form.availability_note.trim() || null,
      rate_indication: form.rate_indication.trim() || null,
      available_for_travel: form.available_for_travel,
    };
    const { error } = await supabase
      .from("registrar_profiles")
      .upsert(payload as any, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Could not save your presentation");
      return;
    }
    setHasProfile(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addEntry = async (kind: Kind) => {
    if (!uid) return;
    const order =
      entries.filter((e) => e.kind === kind).reduce((m, e) => Math.max(m, e.display_order), 0) + 1;
    const { data, error } = await supabase
      .from("registrar_entries")
      .insert({ user_id: uid, kind, display_order: order } as any)
      .select("*")
      .single();
    if (error || !data) {
      toast.error("Could not add the entry");
      return;
    }
    setEntries((prev) => [...prev, { ...(data as any), images: [] }]);
  };

  const updateEntry = (id: string, patch: Partial<Entry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const persistEntry = async (entry: Entry) => {
    const { error } = await supabase
      .from("registrar_entries")
      .update({
        title: entry.title?.trim() || null,
        organisation: entry.organisation?.trim() || null,
        location: entry.location?.trim() || null,
        start_year: entry.start_year || null,
        end_year: entry.end_year || null,
        is_current: entry.is_current,
        description: entry.description?.trim() || null,
        display_order: entry.display_order,
      } as any)
      .eq("id", entry.id);
    if (error) toast.error("Could not save the entry");
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("registrar_entries").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the entry");
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const move = async (entry: Entry, direction: -1 | 1) => {
    const group = entries
      .filter((e) => e.kind === entry.kind)
      .sort((a, b) => a.display_order - b.display_order);
    const index = group.findIndex((e) => e.id === entry.id);
    const swap = group[index + direction];
    if (!swap) return;
    const a = entry.display_order;
    const b = swap.display_order;
    updateEntry(entry.id, { display_order: b });
    updateEntry(swap.id, { display_order: a });
    await Promise.all([
      supabase.from("registrar_entries").update({ display_order: b } as any).eq("id", entry.id),
      supabase.from("registrar_entries").update({ display_order: a } as any).eq("id", swap.id),
    ]);
  };

  const uploadImages = async (entry: Entry, files: FileList) => {
    if (!uid) return;
    setUploadingFor(entry.id);
    const added: EntryImage[] = [];
    let order = (entry.images?.length || 0) + 1;
    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 15 MB`);
        continue;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${uid}/registrar/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: false });
      if (upErr) {
        toast.error(`Could not upload ${file.name}`);
        continue;
      }
      const { data, error } = await supabase
        .from("registrar_entry_images")
        .insert({
          entry_id: entry.id,
          user_id: uid,
          storage_path: path,
          display_order: order++,
        } as any)
        .select("*")
        .single();
      if (!error && data) added.push(data as any);
    }
    setUploadingFor(null);
    if (added.length) {
      updateEntry(entry.id, { images: [...(entry.images || []), ...added] });
    }
  };

  const saveCaption = async (image: EntryImage) => {
    await supabase
      .from("registrar_entry_images")
      .update({ caption: image.caption?.trim() || null } as any)
      .eq("id", image.id);
  };

  const deleteImage = async (entry: Entry, image: EntryImage) => {
    const { error } = await supabase.from("registrar_entry_images").delete().eq("id", image.id);
    if (error) {
      toast.error("Could not remove the photo");
      return;
    }
    await supabase.storage.from("profile-photos").remove([image.storage_path]);
    updateEntry(entry.id, { images: (entry.images || []).filter((i) => i.id !== image.id) });
  };

  const renderGroup = (kind: Kind) => {
    const meta = KIND_META[kind];
    const Icon = meta.icon;
    const group = entries
      .filter((e) => e.kind === kind)
      .sort((a, b) => a.display_order - b.display_order);

    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl flex items-center gap-2">
              <Icon className="w-4 h-4" /> {meta.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{meta.hint}</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => addEntry(kind)}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>

        {group.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed border-border rounded-sm p-5">
            Nothing added yet.
          </p>
        ) : (
          <div className="space-y-4">
            {group.map((entry, i) => (
              <div key={entry.id} className="border border-border rounded-sm p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {kind === "education" ? "Degree or programme" : "Role or title"}
                      </Label>
                      <Input
                        autoComplete="off"
                        value={entry.title || ""}
                        onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
                        onBlur={() => persistEntry(entry)}
                        placeholder={
                          kind === "education"
                            ? "BA Art history and theory"
                            : kind === "project"
                            ? "Unpacking loan objects"
                            : "Senior registrar, documentation department"
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {kind === "education" ? "Institution" : "Organisation"}
                      </Label>
                      <Input
                        autoComplete="off"
                        value={entry.organisation || ""}
                        onChange={(e) => updateEntry(entry.id, { organisation: e.target.value })}
                        onBlur={() => persistEntry(entry)}
                        placeholder="The Hermitage"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Place</Label>
                      <Input
                        autoComplete="off"
                        value={entry.location || ""}
                        onChange={(e) => updateEntry(entry.id, { location: e.target.value })}
                        onBlur={() => persistEntry(entry)}
                        placeholder="St Petersburg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">From year</Label>
                        <Input
                          autoComplete="off"
                          inputMode="numeric"
                          value={entry.start_year ?? ""}
                          onChange={(e) =>
                            updateEntry(entry.id, {
                              start_year: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          onBlur={() => persistEntry(entry)}
                          placeholder="1999"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">To year</Label>
                        <Input
                          autoComplete="off"
                          inputMode="numeric"
                          value={entry.end_year ?? ""}
                          onChange={(e) =>
                            updateEntry(entry.id, {
                              end_year: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          onBlur={() => persistEntry(entry)}
                          placeholder="2011"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={i === 0}
                      onClick={() => move(entry, -1)}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={i === group.length - 1}
                      onClick={() => move(entry, 1)}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => deleteEntry(entry.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {kind === "project" ? "What the work involved" : "Responsibilities"}
                  </Label>
                  <Textarea
                    autoComplete="off"
                    rows={4}
                    value={entry.description || ""}
                    onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                    onBlur={() => persistEntry(entry)}
                    placeholder="One point per line."
                    className="resize-none"
                  />
                </div>

                {kind === "project" && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs">Photographs</Label>
                      <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                        <ImagePlus className="w-3.5 h-3.5" />
                        {uploadingFor === entry.id ? "Uploading..." : "Add photos"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.length) uploadImages(entry, e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {(entry.images || []).length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(entry.images || []).map((img) => (
                          <div key={img.id} className="flex gap-3 items-start">
                            <div className="relative">
                              <img
                                src={publicUrl(img.storage_path)}
                                alt={img.caption || "Project photograph"}
                                className="w-20 h-20 object-cover rounded-sm border border-border"
                              />
                              <button
                                type="button"
                                onClick={() => deleteImage(entry, img)}
                                className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-0.5"
                                aria-label="Remove photo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <Input
                              autoComplete="off"
                              value={img.caption || ""}
                              placeholder="Caption"
                              onChange={(e) =>
                                updateEntry(entry.id, {
                                  images: (entry.images || []).map((i) =>
                                    i.id === img.id ? { ...i, caption: e.target.value } : i
                                  ),
                                })
                              }
                              onBlur={() =>
                                saveCaption(
                                  (entry.images || []).find((i) => i.id === img.id) as EntryImage
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        <header className="space-y-3">
          <h1 className="text-3xl">My presentation</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            This is what artists, collectors and institutions see when they find you in the
            registrar directory. You can change it whenever you like. Your verified status is
            confirmed by the Foundation and is not affected by these edits.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {isVerified ? (
              <Badge variant="secondary">Verified registrar</Badge>
            ) : (
              <Badge variant="outline">Pending verification</Badge>
            )}
            {uid && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to={`/registrars/${uid}`}>
                  <ExternalLink className="w-3.5 h-3.5" /> View public page
                </Link>
              </Button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="h-24 bg-secondary animate-pulse rounded-sm" />
            <div className="h-48 bg-secondary animate-pulse rounded-sm" />
          </div>
        ) : (
          <>
            <section className="space-y-5">
              <h2 className="text-xl">About your work</h2>
              <div className="space-y-1.5">
                <Label className="text-xs">Professional statement</Label>
                <Textarea
                  autoComplete="off"
                  rows={6}
                  value={form.professional_statement}
                  onChange={(e) =>
                    setForm({ ...form, professional_statement: e.target.value })
                  }
                  placeholder="How you work, what you take on, and what artists and collections can expect from you."
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Years of experience</Label>
                  <Input
                    autoComplete="off"
                    inputMode="numeric"
                    value={form.years_experience}
                    onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nationality</Label>
                  <Input
                    autoComplete="off"
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Specialisations</Label>
                  <Input
                    autoComplete="off"
                    value={form.specializations}
                    onChange={(e) => setForm({ ...form, specializations: e.target.value })}
                    placeholder="Painting, works on paper, porcelain"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Areas of work</Label>
                  <Input
                    autoComplete="off"
                    value={form.work_areas}
                    onChange={(e) => setForm({ ...form, work_areas: e.target.value })}
                    placeholder="Cataloguing, loans, condition reporting, courier work"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Collection systems</Label>
                  <Input
                    autoComplete="off"
                    value={form.cms_systems}
                    onChange={(e) => setForm({ ...form, cms_systems: e.target.value })}
                    placeholder="TMS, EMu, MuseumPlus"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Languages</Label>
                  <Input
                    autoComplete="off"
                    value={form.languages}
                    onChange={(e) => setForm({ ...form, languages: e.target.value })}
                    placeholder="Russian (native), English (fluent), Norwegian (B2)"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Geographic coverage</Label>
                  <Input
                    autoComplete="off"
                    value={form.geographic_coverage}
                    onChange={(e) => setForm({ ...form, geographic_coverage: e.target.value })}
                    placeholder="Norway, Nordic countries, travel across Europe"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Credentials and memberships</Label>
                  <Textarea
                    autoComplete="off"
                    rows={3}
                    value={form.credentials}
                    onChange={(e) => setForm({ ...form, credentials: e.target.value })}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Education summary</Label>
                  <Textarea
                    autoComplete="off"
                    rows={2}
                    value={form.education}
                    onChange={(e) => setForm({ ...form, education: e.target.value })}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="border border-border rounded-sm p-5 space-y-5">
                <div>
                  <h3 className="text-base">Availability for freelance work</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Artists, estates and collections use this to see whether they can hire you
                    right now.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm">Open to freelance assignments</Label>
                  <Switch
                    checked={form.available_for_freelance}
                    onCheckedChange={(v) => setForm({ ...form, available_for_freelance: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm">Available to travel</Label>
                  <Switch
                    checked={form.available_for_travel}
                    onCheckedChange={(v) => setForm({ ...form, available_for_travel: v })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Availability note</Label>
                  <Textarea
                    autoComplete="off"
                    rows={2}
                    value={form.availability_note}
                    onChange={(e) => setForm({ ...form, availability_note: e.target.value })}
                    placeholder="Two to three days a week, from October. Short projects and inventories welcome."
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rate indication</Label>
                  <Input
                    autoComplete="off"
                    value={form.rate_indication}
                    onChange={(e) => setForm({ ...form, rate_indication: e.target.value })}
                    placeholder="Day rate on request, or from EUR 350 per day"
                  />
                </div>
              </div>

              <Button onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : saved ? "Saved ✓" : "Save •"}
              </Button>
              {!hasProfile && (
                <p className="text-xs text-muted-foreground">
                  Your presentation becomes public once the Foundation has verified you.
                </p>
              )}
            </section>

            {renderGroup("position")}
            {renderGroup("education")}
            {renderGroup("project")}

            <RegistrarListingToggle />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default RegistrarPresentation;
