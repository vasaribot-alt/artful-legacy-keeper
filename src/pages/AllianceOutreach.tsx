import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, ExternalLink, Mail, Plus, Search, Sparkles, Trash2, UserSearch } from "lucide-react";

type Category =
  | "curators" | "art_critics" | "galleries" | "museums" | "universities"
  | "foundations" | "corporate_collections" | "registrars" | "organisations" | "artist_organisations" | "other";

type Status =
  | "to_contact" | "contacted" | "replied" | "meeting"
  | "partnered" | "declined";

interface Target {
  id: string;
  name: string;
  country: string | null;
  category: Category;
  website: string | null;
  contact_email: string | null;
  contact_person: string | null;
  contact_title: string | null;
  status: Status;
  last_contacted_at: string | null;
  notes: string | null;
  email_subject: string | null;
  email_body: string | null;
  email_generated_at: string | null;
  tag: string | null;
  decision_maker_research: string | null;
  research_at: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  curators: "Curators",
  art_critics: "Art Critics",
  galleries: "Galleries",
  museums: "Museums",
  universities: "Universities & Research",
  foundations: "Foundations",
  corporate_collections: "Corporate Collections",
  registrars: "Registrars",
  organisations: "Organisations (Umbrella)",
  artist_organisations: "Artist Organisations",
  other: "Other",
};

const STATUS_LABELS: Record<Status, string> = {
  to_contact: "To contact",
  contacted: "Contacted",
  replied: "Replied",
  meeting: "Meeting",
  partnered: "Alliance Partner",
  declined: "Declined",
};

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "outline"> = {
  to_contact: "outline",
  contacted: "secondary",
  replied: "secondary",
  meeting: "default",
  partnered: "default",
  declined: "outline",
};

const TAG_LABELS: Record<string, string> = {
  seed_funding: "Seed funding shortlist",
};

const STATUSES = Object.keys(STATUS_LABELS) as Status[];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const EMPTY_FORM = {
  name: "",
  country: "",
  category: "curators" as Category,
  website: "",
  contact_email: "",
  contact_person: "",
  notes: "",
};

export default function AllianceOutreach() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [researching, setResearching] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [draftTarget, setDraftTarget] = useState<Target | null>(null);
  const [draftLanguage, setDraftLanguage] = useState<string>("English");
  const [draftSenderName, setDraftSenderName] = useState<string>(
    () => localStorage.getItem("garf.outreach.senderName") || ""
  );
  const [draftRecipientCapacity, setDraftRecipientCapacity] = useState<string>("");
  const DEFAULT_SIGNATURE = `Jan S Kindem
Email: jan@globalartistregistry.org
Direct phone: +47 94235177

Global Artist Registry Foundation
Jan Pieterszoon Coenstraat 7, The Hague, 2595 WP, The Netherlands
Web: https://globalartistregistry.org/
Phone: +31-850 600 529`;
  const [draftSignature, setDraftSignature] = useState<string>(
    () => localStorage.getItem("garf.outreach.signature") || DEFAULT_SIGNATURE
  );
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const openDraft = (t: Target) => {
    setDraftTarget(t);
    setDraftSubject(t.email_subject || "");
    setDraftBody(t.email_body || "");
    setDraftLanguage("English");
    setDraftRecipientCapacity(
      t.contact_title
        ? (t.contact_person ? `${t.contact_title}, ${t.contact_person} of ${t.name}` : `${t.contact_title} of ${t.name}`)
        : ""
    );
  };

  const generateDraft = async () => {
    if (!draftTarget) return;
    localStorage.setItem("garf.outreach.senderName", draftSenderName.trim());
    localStorage.setItem("garf.outreach.signature", draftSignature);
    setDraftGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-outreach-email", {
      body: {
        target_id: draftTarget.id,
        language: draftLanguage,
        sender_name: draftSenderName.trim() || undefined,
        recipient_capacity: draftRecipientCapacity.trim() || undefined,
        signature: draftSignature.trim() || undefined,
      },
    });
    setDraftGenerating(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Could not generate draft");
      return;
    }
    setDraftSubject(data.subject || "");
    setDraftBody(data.body || "");
    setTargets(prev => prev.map(x => x.id === draftTarget.id ? {
      ...x, email_subject: data.subject || null, email_body: data.body || null,
      email_generated_at: new Date().toISOString(),
    } : x));
    toast.success("Draft generated");
  };

  const saveDraft = async () => {
    if (!draftTarget) return;
    await update(draftTarget.id, {
      email_subject: draftSubject || null,
      email_body: draftBody || null,
    });
    toast.success("Draft saved");
  };

  const copyDraft = async () => {
    const text = draftSubject ? `Subject: ${draftSubject}\n\n${draftBody}` : draftBody;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };


  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("alliance_outreach_targets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load outreach targets.");
    else setTargets((data as Target[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Target>) => {
    const { error } = await supabase
      .from("alliance_outreach_targets").update(patch).eq("id", id);
    if (error) { toast.error("Could not update."); return; }
    setTargets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const markContacted = async (id: string) => {
    const now = new Date().toISOString();
    await update(id, { status: "contacted", last_contacted_at: now });
    toast.success("Marked as contacted");
  };

  const researchDecisionMakers = async (ids: string[], label: string) => {
    if (ids.length === 0) return;
    setResearching(label);
    const { data, error } = await supabase.functions.invoke("research-decision-maker", {
      body: { target_ids: ids },
    });
    setResearching(null);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Could not research contacts");
      if (!data?.results?.length) return;
    }
    const results: any[] = data?.results || [];
    setTargets(prev => prev.map(t => {
      const r = results.find(x => x.id === t.id);
      return r ? { ...t, ...r } : t;
    }));
    toast.success(`Researched ${results.length} organisation${results.length === 1 ? "" : "s"}`);
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this outreach target?")) return;
    const { error } = await supabase
      .from("alliance_outreach_targets").delete().eq("id", id);
    if (error) { toast.error("Could not delete."); return; }
    setTargets(prev => prev.filter(t => t.id !== id));
    toast.success("Removed");
  };

  const add = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("alliance_outreach_targets")
      .insert({
        name: form.name.trim(),
        country: form.country.trim() || null,
        category: form.category,
        website: form.website.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_person: form.contact_person.trim() || null,
        notes: form.notes.trim() || null,
      })
      .select("*").single();
    setSaving(false);
    if (error) { toast.error("Could not add target."); return; }
    setTargets(prev => [data as Target, ...prev]);
    setForm(EMPTY_FORM);
    setAddOpen(false);
    toast.success("Target added");
  };

  const filtered = useMemo(() => targets.filter(t => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (tagFilter !== "all" && (t.tag || "") !== tagFilter) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      if (![t.name, t.country, t.contact_person, t.contact_email, t.notes]
        .some(f => f?.toLowerCase().includes(s))) return false;
    }
    return true;
  }), [targets, q, categoryFilter, statusFilter, tagFilter]);

  const tags = useMemo(
    () => Array.from(new Set(targets.map(t => t.tag).filter(Boolean) as string[])).sort(),
    [targets]
  );

  const statusCounts = useMemo(() => targets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>), [targets]);

  return (
    <AppLayout title="Alliance Outreach">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-serif">Alliance outreach</h1>
            <p className="text-muted-foreground text-sm">
              Track partnership outreach to associations across every Alliance category — curators, art critics, galleries, museums, universities & research, foundations, corporate collections, and registrars.
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1.5" />Add target</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add outreach target</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Association name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="e.g. Norway" />
                  </div>
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contact person</Label>
                    <Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
                  </div>
                  <div>
                    <Label>Contact email</Label>
                    <Input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={add} disabled={saving}>{saving ? "Saving…" : "Add"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {STATUSES.map(s => (
            <div key={s} className="border border-border rounded-md p-3">
              <div className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</div>
              <div className="text-2xl font-serif">{statusCounts[s] || 0}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, country, contact…" className="pl-9" />
            </div>
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as Category | "all")}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          {tags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All lists (tags)</SelectItem>
                {tags.map(tg => (
                  <SelectItem key={tg} value={tg}>{TAG_LABELS[tg] || tg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            disabled={!!researching}
            onClick={() => researchDecisionMakers(
              filtered.filter(t => !t.decision_maker_research).slice(0, 10).map(t => t.id),
              "batch"
            )}
          >
            <UserSearch className="w-4 h-4 mr-1.5" />
            {researching === "batch" ? "Researching…" : "Find decision makers (next 10)"}
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">No outreach targets match the current filters.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(t => (
              <div key={t.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{t.name}</h3>
                      <Badge variant="outline">{CATEGORY_LABELS[t.category]}</Badge>
                      <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                      {t.tag && <Badge variant="secondary">{TAG_LABELS[t.tag] || t.tag}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {t.country || "—"}
                      {t.contact_person && <> · {t.contact_person}</>}
                      {t.last_contacted_at && <> · last contacted {new Date(t.last_contacted_at).toLocaleDateString()}</>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {t.contact_email && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`mailto:${t.contact_email}`}><Mail className="w-3.5 h-3.5 mr-1.5" />Email</a>
                      </Button>
                    )}
                    {t.website && (
                      <Button asChild size="sm" variant="outline">
                        <a href={t.website} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Website</a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={researching === t.id}
                      onClick={() => researchDecisionMakers([t.id], t.id)}
                    >
                      <UserSearch className="w-3.5 h-3.5 mr-1.5" />
                      {researching === t.id ? "Researching…" : t.decision_maker_research ? "Re-research" : "Find decision maker"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDraft(t)}>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      {t.email_body ? "Email draft" : "Generate email"}
                    </Button>
                    {t.status === "to_contact" && (
                      <Button size="sm" onClick={() => markContacted(t.id)}>Mark contacted</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {t.decision_maker_research && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                    {t.decision_maker_research}
                  </div>
                )}

                <div className="pt-2 border-t border-border space-y-3">
                  <div className="grid md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Title</Label>
                      <Input
                        defaultValue={t.contact_title || ""}
                        placeholder="e.g. General Manager"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (t.contact_title || "")) update(t.id, { contact_title: v || null });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Contact person</Label>
                      <Input
                        defaultValue={t.contact_person || ""}
                        placeholder="Name"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (t.contact_person || "")) update(t.id, { contact_person: v || null });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Contact email</Label>
                      <Input
                        type="email"
                        defaultValue={t.contact_email || ""}
                        placeholder="name@example.org"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (t.contact_email || "")) update(t.id, { contact_email: v || null });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Website</Label>
                      <Input
                        defaultValue={t.website || ""}
                        placeholder="https://…"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (t.website || "")) update(t.id, { website: v || null });
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-[180px_1fr] gap-3 items-start">
                    <Select value={t.status} onValueChange={(v) => update(t.id, { status: v as Status })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Notes — meeting date, reply summary, next step…"
                      rows={2}
                      defaultValue={t.notes || ""}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== (t.notes || "")) update(t.id, { notes: v || null });
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!draftTarget} onOpenChange={(o) => !o && setDraftTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email draft — {draftTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Your name (as sender)</Label>
                <Input
                  value={draftSenderName}
                  onChange={e => setDraftSenderName(e.target.value)}
                  placeholder="e.g. Jan S. Kindem"
                />
              </div>
              <div>
                <Label>Recipient's capacity / title</Label>
                <Input
                  value={draftRecipientCapacity}
                  onChange={e => setDraftRecipientCapacity(e.target.value)}
                  placeholder={draftTarget?.contact_person ? `e.g. General Manager of ${draftTarget?.name}` : "e.g. President, Director"}
                />
              </div>
            </div>
            <div>
              <Label>Signature (appended verbatim)</Label>
              <Textarea
                rows={8}
                value={draftSignature}
                onChange={e => setDraftSignature(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <Label>Language</Label>
                <Select value={draftLanguage} onValueChange={setDraftLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["English", "French", "German", "Spanish", "Italian", "Dutch", "Portuguese"].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generateDraft} disabled={draftGenerating}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                {draftGenerating ? "Generating…" : draftTarget?.email_body ? "Regenerate" : "Generate"}
              </Button>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={draftSubject} onChange={e => setDraftSubject(e.target.value)} placeholder="Subject line" />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea rows={14} value={draftBody} onChange={e => setDraftBody(e.target.value)} placeholder="Email body — click Generate to draft with AI." />
            </div>
            {draftTarget?.email_generated_at && (
              <p className="text-xs text-muted-foreground">
                Last generated {new Date(draftTarget.email_generated_at).toLocaleString()}
              </p>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={copyDraft} disabled={!draftBody}>
              <Copy className="w-4 h-4 mr-1.5" />Copy
            </Button>
            {draftTarget?.contact_email && (
              <Button asChild variant="outline" disabled={!draftBody}>
                <a
                  href={`mailto:${draftTarget.contact_email}?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`}
                >
                  <Mail className="w-4 h-4 mr-1.5" />Open in mail app
                </a>
              </Button>
            )}
            <Button onClick={saveDraft} disabled={!draftBody && !draftSubject}>Save draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
