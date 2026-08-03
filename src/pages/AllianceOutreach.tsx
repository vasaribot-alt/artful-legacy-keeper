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
import { OutreachEmailTextsDialog, type OutreachEmailText } from "@/components/OutreachEmailTextsDialog";
import { Copy, ExternalLink, FileDown, FileText, Loader2, Mail, Plus, Search, Sparkles, Trash2, UserSearch } from "lucide-react";


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
  grant_funding: "Grant funding (art & technology)",
  us_partner: "Strategic US partner",
  partnership_core: "Core partnership (GARF alliance)",
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

  // Built-in preset letter: Allied Curator Partner invitation
  const CURATOR_PARTNER_SUBJECT =
    "Invitation: {{name}} as Allied Curator Partner — Global Artist Registry Foundation";
  const CURATOR_PARTNER_BODY = `{{greeting}}

I am writing on behalf of the Global Artist Registry Foundation (GARF), a Dutch non-profit foundation (stichting) building an independent, 100-year archival record of contemporary artists and their work — free for artists, and governed for the public good.

Curators are central to how art is understood, contextualised, and preserved for the future. As part of our effort to bring every relevant group of stakeholders into the long-term archival documentation of contemporary art, we are establishing a broader Global Alliance that includes curators, galleries, museums, universities and research institutions, foundations, corporate collections, and registrars. We would be honoured if {{name}} would join us as an Allied Curator Partner.

What partnership means, in practice:

- Your members get free professional profiles on GARF and can link the exhibitions they have curated to the artists' permanent records.
- Your association is listed as an Allied Curator Partner on our public Alliance page, with a link to your site.
- Curators can personally invite the artists they work with to join GARF — free of charge — so the exhibitions and scholarship curators produce are anchored to the artists' own permanent records.
- No fees, no exclusivity, no data ownership by GARF — members keep full ownership and control of their records.
- Optional: a short interview or joint statement we can publish when the Alliance launches publicly.

We would be grateful for a short call (20–30 minutes) with the board, or a delegated contact, to walk through the project, answer questions, and discuss how a partnership could work for {{name}}.

More about GARF: https://globalartistregistry.org
Alliance overview (curators): https://globalartistregistry.org/alliance/curators

With kind regards,

{{signature}}`;

  // Saved email texts library (per category, reusable)
  const [emailTexts, setEmailTexts] = useState<OutreachEmailText[]>([]);
  const [textsOpen, setTextsOpen] = useState(false);
  const [pickedTextId, setPickedTextId] = useState<string>("");

  const loadEmailTexts = async () => {
    const { data, error } = await (supabase.from("outreach_email_templates" as never) as any)
      .select("id, name, category, subject, body, updated_at")
      .order("name", { ascending: true });
    if (!error) setEmailTexts((data as OutreachEmailText[]) || []);
  };

  useEffect(() => { loadEmailTexts(); }, []);

  // Reusable letter template (edited once, reused for every recipient)
  const [templateSubject, setTemplateSubject] = useState<string>(
    () => localStorage.getItem("garf.outreach.tplSubject") || ""
  );
  const [templateBody, setTemplateBody] = useState<string>(
    () => localStorage.getItem("garf.outreach.tplBody") || ""
  );
  const hasTemplate = !!templateBody.trim();




  const buildGreeting = (t: Target) => {
    if (!t.contact_person) return "Dear colleagues,";
    const title = t.contact_title ? `, ${t.contact_title} of ${t.name}` : "";
    return `Dear ${t.contact_person}${title},`;
  };

  const fillTemplate = (t: Target, text: string) =>
    text
      .replace(/\{\{\s*name\s*\}\}/gi, t.name)
      .replace(/\{\{\s*contact_person\s*\}\}/gi, t.contact_person || "")
      .replace(/\{\{\s*contact_title\s*\}\}/gi, t.contact_title || "")
      .replace(/\{\{\s*country\s*\}\}/gi, t.country || "")
      .replace(/\{\{\s*greeting\s*\}\}/gi, buildGreeting(t))
      .replace(/\{\{\s*signature\s*\}\}/gi, draftSignature.trim());

  const saveAsTemplate = () => {
    localStorage.setItem("garf.outreach.tplSubject", draftSubject);
    localStorage.setItem("garf.outreach.tplBody", draftBody);
    setTemplateSubject(draftSubject);
    setTemplateBody(draftBody);
    toast.success("Saved as reusable template");
  };

  const useTemplateInDraft = () => {
    if (!draftTarget || !hasTemplate) return;
    setDraftSubject(fillTemplate(draftTarget, templateSubject));
    setDraftBody(fillTemplate(draftTarget, templateBody));
    toast.success("Template applied — edit freely, then Save draft");
  };

  const applySavedTextToDraft = (id: string) => {
    const tpl = emailTexts.find(x => x.id === id);
    if (!tpl || !draftTarget) return;
    setPickedTextId(id);
    setDraftSubject(fillTemplate(draftTarget, tpl.subject || ""));
    setDraftBody(fillTemplate(draftTarget, tpl.body || ""));
    toast.success(`“${tpl.name}” applied — edit freely, then Save draft`);
  };

  const applySavedTextToSelected = async (id: string) => {
    const tpl = emailTexts.find(x => x.id === id);
    if (!tpl) return;
    const list = selectedIds
      .map(sid => targets.find(t => t.id === sid))
      .filter(Boolean) as Target[];
    if (list.length === 0) return;
    setBatchOpen(true);
    const results = list.map(t => ({
      id: t.id,
      name: t.name,
      email: t.contact_email || "",
      subject: fillTemplate(t, tpl.subject || ""),
      body: fillTemplate(t, tpl.body || ""),
    }));
    setBatchResults(results);
    setBatchProgress({ done: results.length, total: results.length });
    for (const r of results) {
      await update(r.id, { email_subject: r.subject || null, email_body: r.body || null });
    }
    toast.success(`“${tpl.name}” applied to ${results.length} letters`);
  };



  const useCuratorPartnerLetter = () => {
    if (!draftTarget) return;
    setDraftSubject(fillTemplate(draftTarget, CURATOR_PARTNER_SUBJECT));
    setDraftBody(fillTemplate(draftTarget, CURATOR_PARTNER_BODY));
    toast.success("Curator Partner letter loaded — edit freely, then Save draft");
  };

  const applyCuratorLetterToSelected = async () => {
    const list = selectedIds
      .map(id => targets.find(t => t.id === id))
      .filter(Boolean) as Target[];
    if (list.length === 0) return;
    setBatchOpen(true);
    const results = list.map(t => ({
      id: t.id,
      name: t.name,
      email: t.contact_email || "",
      subject: fillTemplate(t, CURATOR_PARTNER_SUBJECT),
      body: fillTemplate(t, CURATOR_PARTNER_BODY),
    }));
    setBatchResults(results);
    setBatchProgress({ done: results.length, total: results.length });
    for (const r of results) {
      await update(r.id, { email_subject: r.subject || null, email_body: r.body || null });
    }
    toast.success(`Curator Partner letter applied to ${results.length} letters`);
  };


  const applyTemplateToSelected = async () => {
    const list = selectedIds
      .map(id => targets.find(t => t.id === id))
      .filter(Boolean) as Target[];
    if (list.length === 0 || !hasTemplate) return;
    setBatchOpen(true);
    const results = list.map(t => ({
      id: t.id,
      name: t.name,
      email: t.contact_email || "",
      subject: fillTemplate(t, templateSubject),
      body: fillTemplate(t, templateBody),
    }));
    setBatchResults(results);
    setBatchProgress({ done: results.length, total: results.length });
    for (const r of results) {
      await update(r.id, { email_subject: r.subject || null, email_body: r.body || null });
    }
    toast.success(`Template applied to ${results.length} letters`);
  };

  // Batch drafting (10 at a time) + Outlook export
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<
    { id: string; name: string; email: string; subject: string; body: string }[]
  >([]);
  const [batchOpen, setBatchOpen] = useState(false);

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

  // ---------- Batch of 10: generate drafts + export to Outlook ----------
  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 50 ? prev : [...prev, id]
    );
  };

  const selectNextTen = () => {
    const pool = filtered.filter(t => t.contact_email && t.status === "to_contact");
    const next = pool.slice(0, 10).map(t => t.id);
    setSelectedIds(next);
    if (next.length === 0) toast.info("No un-contacted targets with an email in the current filter.");
    else toast.success(`Selected ${next.length} organisations.`);
  };

  const generateBatchDrafts = async () => {
    const batchTargets = selectedIds
      .map(id => targets.find(t => t.id === id))
      .filter(Boolean) as Target[];
    if (batchTargets.length === 0) return;
    localStorage.setItem("garf.outreach.senderName", draftSenderName.trim());
    localStorage.setItem("garf.outreach.signature", draftSignature);
    setBatchRunning(true);
    setBatchOpen(true);
    setBatchResults([]);
    setBatchProgress({ done: 0, total: batchTargets.length });
    const results: typeof batchResults = [];
    for (let i = 0; i < batchTargets.length; i++) {
      const t = batchTargets[i];
      try {
        const capacity = t.contact_title
          ? (t.contact_person ? `${t.contact_title}, ${t.contact_person} of ${t.name}` : `${t.contact_title} of ${t.name}`)
          : "";
        const { data, error } = await supabase.functions.invoke("generate-outreach-email", {
          body: {
            target_id: t.id,
            language: draftLanguage,
            sender_name: draftSenderName.trim() || undefined,
            recipient_capacity: capacity || undefined,
            contact_person: t.contact_person || undefined,
            signature: draftSignature.trim() || undefined,
          },
        });
        if (error || !(data as any)?.success) throw new Error((data as any)?.error || error?.message || "failed");
        const subject = (data as any).subject || "";
        const body = (data as any).body || "";
        results.push({ id: t.id, name: t.name, email: t.contact_email || "", subject, body });
        setTargets(prev => prev.map(x => x.id === t.id ? {
          ...x, email_subject: subject || null, email_body: body || null,
          email_generated_at: new Date().toISOString(),
        } : x));
      } catch (e: any) {
        toast.error(`${t.name}: ${e.message || "draft failed"}`);
      }
      setBatchProgress({ done: i + 1, total: batchTargets.length });
      setBatchResults([...results]);
    }
    setBatchRunning(false);
    toast.success(`Generated ${results.length} of ${batchTargets.length} drafts.`);
  };

  const buildEml = (to: string, subject: string, body: string) => {
    const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
    return [
      "X-Unsent: 1",
      `To: ${to}`,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: base64",
      "",
      b64(body).replace(/(.{76})/g, "$1\r\n"),
      "",
    ].join("\r\n");
  };

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

  const exportBatchToOutlook = () => {
    const ready = batchResults.filter(r => r.body && r.email);
    if (ready.length === 0) {
      toast.error("No drafts with an email address to export.");
      return;
    }
    ready.forEach((r, i) => {
      setTimeout(() => {
        const blob = new Blob([buildEml(r.email, r.subject, r.body)], { type: "message/rfc822" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `GARF-${String(i + 1).padStart(2, "0")}-${slug(r.name)}.eml`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, i * 350);
    });
    toast.success(`Exporting ${ready.length} Outlook drafts (.eml).`);
  };

  const saveBatchEdits = async () => {
    for (const r of batchResults) {
      await update(r.id, { email_subject: r.subject || null, email_body: r.body || null });
    }
    toast.success("Drafts saved");
  };

  const markBatchContacted = async () => {
    const now = new Date().toISOString();
    for (const r of batchResults) await update(r.id, { status: "contacted", last_contacted_at: now });
    toast.success("Marked as contacted");
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
          <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTextsOpen(true)}>
            <FileText className="w-4 h-4 mr-1.5" />Email texts
            {emailTexts.length > 0 && <Badge variant="secondary" className="ml-2">{emailTexts.length}</Badge>}
          </Button>
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
          </div>
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

        {/* Batch mailing bar */}
        <div className="border border-border rounded-md px-3 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Batch mailing —</span>
          <Button size="sm" variant="outline" onClick={selectNextTen}>Select next 10</Button>
          {selectedIds.length > 0 && (
            <>
              <Badge variant="secondary">{selectedIds.length} selected</Badge>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
              <Button size="sm" onClick={generateBatchDrafts} disabled={batchRunning}>
                {batchRunning ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                Generate {selectedIds.length} letters
              </Button>
              <Button size="sm" variant="outline" onClick={applyTemplateToSelected} disabled={batchRunning || !hasTemplate}>
                Use saved template for {selectedIds.length}
              </Button>
              <Button size="sm" variant="outline" onClick={applyCuratorLetterToSelected} disabled={batchRunning}>
                Curator Partner letter for {selectedIds.length}
              </Button>
              {emailTexts.length > 0 && (
                <Select value="" onValueChange={(v) => applySavedTextToSelected(v)}>
                  <SelectTrigger className="w-[260px] h-8 text-xs">
                    <SelectValue placeholder={`Use email text for ${selectedIds.length}…`} />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTexts.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}{t.category ? ` — ${CATEGORY_LABELS[t.category as Category] || t.category}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>

          )}
          {batchResults.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setBatchOpen(true)}>
              <Mail className="w-3.5 h-3.5 mr-1" /> Review {batchResults.length} drafts
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">
            Exports .eml files — open them in Outlook as ready-to-send drafts.
          </span>
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
                  <div className="min-w-0 flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedIds.includes(t.id)}
                      onChange={() => toggleSelectOne(t.id)}
                      aria-label={`Select ${t.name} for batch mailing`}
                    />
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

      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Batch letters {batchProgress ? `— ${batchProgress.done}/${batchProgress.total}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Language</Label>
                <Select value={draftLanguage} onValueChange={setDraftLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["English", "French", "German", "Spanish", "Italian", "Dutch", "Portuguese", "Norwegian", "Swedish", "Danish"].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Sender name</Label>
                <Input value={draftSenderName} onChange={e => setDraftSenderName(e.target.value)} placeholder="Jan S Kindem" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Signature (appended verbatim)</Label>
              <Textarea
                rows={6}
                value={draftSignature}
                onChange={e => setDraftSignature(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            {batchRunning && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Drafting letters…
              </div>
            )}
            {batchResults.length === 0 && !batchRunning && (
              <div className="text-muted-foreground">No drafts yet. Select organisations and click “Generate letters”.</div>
            )}
            {batchResults.map((r, i) => (
              <div key={r.id} className="border border-border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{i + 1}. {r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.email || "no email"}</div>
                </div>
                <Input
                  value={r.subject}
                  onChange={e => setBatchResults(prev => prev.map(x => x.id === r.id ? { ...x, subject: e.target.value } : x))}
                />
                <Textarea
                  rows={8}
                  value={r.body}
                  onChange={e => setBatchResults(prev => prev.map(x => x.id === r.id ? { ...x, body: e.target.value } : x))}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={saveBatchEdits} disabled={batchRunning || batchResults.length === 0}>
              Save edits
            </Button>
            <Button variant="outline" onClick={markBatchContacted} disabled={batchRunning || batchResults.length === 0}>
              Mark as contacted
            </Button>
            <Button onClick={exportBatchToOutlook} disabled={batchRunning || batchResults.length === 0}>
              <FileDown className="w-4 h-4 mr-1.5" /> Export to Outlook (.eml)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={saveAsTemplate} disabled={!draftBody.trim()}>
                Save this text as template
              </Button>
              <Button variant="outline" size="sm" onClick={useTemplateInDraft} disabled={!hasTemplate}>
                Use saved template
              </Button>
              <Button variant="outline" size="sm" onClick={useCuratorPartnerLetter}>
                Use Curator Partner letter
              </Button>

              <span className="text-[11px] text-muted-foreground">
                Placeholders: {"{{greeting}} {{name}} {{contact_person}} {{contact_title}} {{country}} {{signature}}"}
              </span>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={draftSubject} onChange={e => setDraftSubject(e.target.value)} placeholder="Subject line" />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea rows={14} value={draftBody} onChange={e => setDraftBody(e.target.value)} placeholder="Email body — generate with AI, or reuse your saved template." />
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
