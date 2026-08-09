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
import { markdownToHtml, markdownToPlainText } from "@/lib/emailMarkdown";
import { formatCopyBlock, formatCopyBlocks } from "@/lib/outreachCopyFormat";
import { AlertTriangle, Copy, ExternalLink, FileText, Loader2, Mail, Plus, Search, Sparkles, Trash2, Upload, UserSearch } from "lucide-react";

/** Loose name key: lowercase, strip parentheses/punctuation and generic words */
const nameKey = (s: string) =>
  s.toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9åäöæøéèüß ]/gi, " ")
    .replace(/\b(the|association|assoc|of|and|for|e\.?v|foundation|stichting|society|network|verein)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hostKey = (s: string) => {
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch { return ""; }
};


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
  const [batchStep, setBatchStep] = useState(0);
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftPreview, setDraftPreview] = useState(false);
  // When a saved email text is selected, choose between verbatim apply or AI rewrite based on it.
  const [aiRewriteFromTemplate, setAiRewriteFromTemplate] = useState(false);
  const [dupScanOpen, setDupScanOpen] = useState(false);
  const [dupScanRunning, setDupScanRunning] = useState(false);
  const [dupGroups, setDupGroups] = useState<{ key: string; reason: string; items: Target[] }[]>([]);


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
    setPickedTextId(id);
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
    toast.success(`"${tpl.name}" applied to ${results.length} letters`);
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
  // Generated letters are kept in localStorage so a refresh / publish never loses them.
  const BATCH_KEY = "garf.outreach.lastBatch";
  const SEL_KEY = "garf.outreach.lastSelection";
  const readStored = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const [selectedIds, setSelectedIds] = useState<string[]>(() => readStored<string[]>(SEL_KEY, []));
  const [batchRunning, setBatchRunning] = useState(false);

  const [draftMailbox, setDraftMailbox] = useState<string | null>(null);
  const [draftLinks, setDraftLinks] = useState<{ to: string; subject: string; webLink: string }[]>([]);
  const [outlookAccount, setOutlookAccount] = useState<{ address: string | null; displayName: string | null; accountType: string } | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [forceReauthOpen, setForceReauthOpen] = useState(false);

  const checkOutlookAccount = async () => {
    setCheckingAccount(true);
    const { data, error } = await supabase.functions.invoke("check-outlook-account");
    setCheckingAccount(false);
    if (error || !(data as any)?.success) {
      toast.error((data as any)?.error || error?.message || "Could not read the Outlook account");
      return;
    }
    setOutlookAccount({
      address: (data as any).address ?? null,
      displayName: (data as any).displayName ?? null,
      accountType: (data as any).accountType ?? "work",
    });
  };


  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  type BatchResult = { id: string; name: string; email: string; subject: string; body: string };
  const [batchResults, setBatchResults] = useState<BatchResult[]>(() =>
    readStored<BatchResult[]>(BATCH_KEY, [])
  );
  const [batchOpen, setBatchOpen] = useState(false);

  // Persist the last batch + selection so nothing is lost on refresh or publish.
  useEffect(() => {
    try { localStorage.setItem(BATCH_KEY, JSON.stringify(batchResults)); } catch { /* quota */ }
  }, [batchResults]);
  useEffect(() => {
    try { localStorage.setItem(SEL_KEY, JSON.stringify(selectedIds)); } catch { /* quota */ }
  }, [selectedIds]);


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
    const picked = emailTexts.find(x => x.id === pickedTextId);
    // A saved email text is selected and "verbatim" mode is active: apply placeholders only.
    if (picked && !aiRewriteFromTemplate) {
      const subject = fillTemplate(draftTarget, picked.subject || "");
      const body = fillTemplate(draftTarget, picked.body || "");
      setDraftSubject(subject);
      setDraftBody(body);
      await update(draftTarget.id, { email_subject: subject || null, email_body: body || null });
      toast.success(`“${picked.name}” applied word-for-word`);
      return;
    }
    setDraftGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-outreach-email", {
      body: {
        target_id: draftTarget.id,
        language: draftLanguage,
        sender_name: draftSenderName.trim() || undefined,
        recipient_capacity: draftRecipientCapacity.trim() || undefined,
        signature: draftSignature.trim() || undefined,
        template_subject: picked?.subject || undefined,
        template_body: picked?.body || undefined,
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
    toast.success(picked ? `Draft generated from "${picked.name}"` : "Draft generated");
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
    const text = formatCopyBlock({
      email: draftTarget?.contact_email || "",
      subject: draftSubject,
      body: markdownToPlainText(draftBody),
      signature: draftSignature,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied — email, subject and letter (no signature)");
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

  // Live duplicate detection for the add form
  const duplicates = useMemo(() => {
    const n = nameKey(form.name);
    const email = form.contact_email.trim().toLowerCase();
    const host = hostKey(form.website.trim());
    if (!n && !email && !host) return [] as Target[];
    return targets.filter(t => {
      const tn = nameKey(t.name);
      if (n && tn && (tn === n || tn.includes(n) || n.includes(tn))) return true;
      if (email && t.contact_email && t.contact_email.trim().toLowerCase() === email) return true;
      if (host && t.website && hostKey(t.website) === host) return true;
      return false;
    }).slice(0, 5);
  }, [form.name, form.contact_email, form.website, targets]);


  const add = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (duplicates.length > 0) {
      const ok = confirm(
        `Possible duplicate: "${duplicates[0].name}" is already in the list${duplicates[0].country ? ` (${duplicates[0].country})` : ""}.\n\nAdd anyway?`
      );
      if (!ok) return;
    }
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

  const findExistingDuplicates = () => {
    setDupScanRunning(true);
    const groups: { key: string; reason: string; items: Target[] }[] = [];
    const seenName = new Map<string, Target[]>();
    const seenEmail = new Map<string, Target[]>();
    const seenHost = new Map<string, Target[]>();

    for (const t of targets) {
      const nk = nameKey(t.name);
      if (nk) {
        const list = seenName.get(nk) || [];
        list.push(t);
        seenName.set(nk, list);
      }
      const em = t.contact_email?.trim().toLowerCase();
      if (em) {
        const list = seenEmail.get(em) || [];
        list.push(t);
        seenEmail.set(em, list);
      }
      const host = hostKey(t.website || "");
      if (host) {
        const list = seenHost.get(host) || [];
        list.push(t);
        seenHost.set(host, list);
      }
    }

    const addGroup = (reason: string, list: Target[]) => {
      if (list.length < 2) return;
      const key = list.map(x => x.id).sort().join("|");
      if (groups.some(g => g.key === key)) return;
      groups.push({ key, reason, items: list });
    };

    for (const [, list] of seenName) {
      // Only flag as name duplicate if the normalized keys are identical or one contains the other
      const first = nameKey(list[0].name);
      const allSame = list.every(t => nameKey(t.name) === first);
      if (allSame) addGroup("Same normalised name", list);
      else {
        // Check pairwise containment
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = nameKey(list[i].name);
            const b = nameKey(list[j].name);
            if (a.includes(b) || b.includes(a)) {
              addGroup("Similar name", [list[i], list[j]]);
            }
          }
        }
      }
    }
    for (const [, list] of seenEmail) addGroup("Same email", list);
    for (const [, list] of seenHost) addGroup("Same website domain", list);

    setDupGroups(groups);
    setDupScanRunning(false);
    setDupScanOpen(true);
    if (groups.length === 0) toast.info("No duplicates found in existing targets.");
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
    const picked = emailTexts.find(x => x.id === pickedTextId);
    // A saved email text is selected and "verbatim" mode is active: apply it verbatim to the whole batch.
    if (picked && !aiRewriteFromTemplate) {
      await applySavedTextToSelected(picked.id);
      return;
    }
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
            template_subject: picked?.subject || undefined,
            template_body: picked?.body || undefined,
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
    toast.success(picked
      ? `Generated ${results.length} of ${batchTargets.length} drafts from "${picked.name}".`
      : `Generated ${results.length} of ${batchTargets.length} drafts.`);
  };

  const saveBatchToOutlook = async () => {
    const ready = batchResults.filter(r => r.body && r.email);
    if (ready.length === 0) {
      toast.error("No drafts with an email address to save.");
      return;
    }
    setBatchRunning(true);
    const { data, error } = await supabase.functions.invoke("save-outlook-drafts", {
      body: {
        drafts: ready.map(r => ({
          to: r.email,
          subject: r.subject,
          bodyHtml: markdownToHtml(withSignature(r.body)),
        })),
      },
    });
    setBatchRunning(false);
    if (error || !data?.saved) {
      toast.error(data?.error || error?.message || "Could not save drafts to Outlook");
      return;
    }
    setDraftMailbox(data.mailbox || null);
    setDraftLinks(Array.isArray(data.links) ? data.links : []);
    if (data.failures?.length) toast.warning(`Saved ${data.saved}; ${data.failures.length} could not be saved.`);
    else toast.success(`${data.saved} drafts saved in Outlook — open them from the links below.`);
  };

  // Send approved letters through Brevo's marketing email API.
  const sendBatchViaBrevo = async () => {
    const ready = batchResults.filter(r => r.body && r.email);
    if (ready.length === 0) {
      toast.error("No letters with an email address to send.");
      return;
    }
    if (!window.confirm(`Send ${ready.length} letter${ready.length === 1 ? "" : "s"} now via Brevo from jan@globalartistregistry.org?`)) return;
    setBatchRunning(true);
    const { data, error } = await supabase.functions.invoke("send-outreach-brevo", {
      body: {
        fromName: "Jan S. Kindem — Global Artist Registry Foundation",
        campaignTag: "alliance_outreach",
        letters: ready.map(r => ({
          to: r.email,
          subject: r.subject || "",
          bodyHtml: markdownToHtml(withSignature(r.body)),
          bodyText: markdownToPlainText(withSignature(r.body)),
        })),
      },
    });
    setBatchRunning(false);
    let payload = data as any;
    if (error) {
      try {
        const res = (error as any)?.context as Response | undefined;
        if (res && typeof res.text === "function") {
          const raw = await res.clone().text();
          try { payload = JSON.parse(raw); } catch { payload = { error: raw || undefined }; }
        }
      } catch { /* keep the generic message */ }
    }
    if (error || !payload?.sent) {
      const detail =
        payload?.error ||
        (Array.isArray(payload?.failures) && payload.failures.length
          ? payload.failures.map((f: { to: string; error: string }) => `${f.to}: ${f.error}`).join(" · ")
          : null) ||
        error?.message ||
        "Could not send the letters";
      toast.error(detail, { duration: 12000 });
      console.error("send-outreach-brevo failed", payload || error);
      return;
    }

    const sentAddresses = new Set<string>(Array.isArray(payload.recipients) ? payload.recipients : []);
    const now = new Date().toISOString();
    for (const r of ready) {
      if (sentAddresses.has(r.email)) {
        await update(r.id, {
          status: "contacted",
          last_contacted_at: now,
          email_subject: r.subject || null,
          email_body: r.body || null,
        });
      }
    }
    if (payload.failures?.length) {
      toast.warning(`Sent ${payload.sent}; ${payload.failures.length} failed (${payload.failures.map((f: { to: string }) => f.to).join(", ")}).`, { duration: 12000 });
    } else {
      toast.success(`${payload.sent} letter${payload.sent === 1 ? "" : "s"} sent via Brevo.`);
    }
  };

  const [sendingDraft, setSendingDraft] = useState(false);
  const sendDraftViaBrevo = async () => {
    if (!draftTarget) return;
    if (!draftTarget.contact_email) {
      toast.error("This contact has no email address.");
      return;
    }
    if (!draftBody) {
      toast.error("Write or generate the letter first.");
      return;
    }
    if (!window.confirm(`Send this letter now to ${draftTarget.contact_email} via Brevo?`)) return;
    setSendingDraft(true);
    const { data, error } = await supabase.functions.invoke("send-outreach-brevo", {
      body: {
        fromName: "Jan S. Kindem — Global Artist Registry Foundation",
        campaignTag: "alliance_outreach",
        letters: [{
          to: draftTarget.contact_email,
          subject: draftSubject || "",
          bodyHtml: markdownToHtml(withSignature(draftBody)),
          bodyText: markdownToPlainText(withSignature(draftBody)),
        }],
      },
    });
    setSendingDraft(false);
    let payload = data as any;
    if (error) {
      try {
        const res = (error as any)?.context as Response | undefined;
        if (res && typeof res.text === "function") {
          const raw = await res.clone().text();
          try { payload = JSON.parse(raw); } catch { payload = { error: raw || undefined }; }
        }
      } catch { /* keep the generic message */ }
    }
    if (error || !payload?.sent) {
      const detail =
        payload?.error ||
        (Array.isArray(payload?.failures) && payload.failures.length
          ? payload.failures.map((f: { to: string; error: string }) => `${f.to}: ${f.error}`).join(" · ")
          : null) ||
        error?.message ||
        "Could not send the letter";
      toast.error(detail, { duration: 12000 });
      console.error("send-outreach-brevo failed", payload || error);
      return;
    }
    await update(draftTarget.id, {
      status: "contacted",
      last_contacted_at: new Date().toISOString(),
      email_subject: draftSubject || null,
      email_body: draftBody || null,
    });
    toast.success(`Letter sent to ${draftTarget.contact_email}.`);
    setDraftTarget(null);
  };


  // Sync alliance contacts to Brevo CRM
  const [syncing, setSyncing] = useState(false);
  const syncToBrevo = async () => {
    if (!window.confirm("Sync all alliance contacts (with email addresses) to Brevo CRM? This creates or updates contacts in the 'GARF Alliance Outreach' list.")) return;
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("sync-brevo-contacts", { body: { source: "alliance" } });
    setSyncing(false);
    if (error) {
      try {
        const res = (error as any)?.context as Response;
        const raw = res ? await res.clone().text() : "";
        const payload = raw ? JSON.parse(raw) : null;
        toast.error(payload?.error || error.message || "Sync failed", { duration: 12000 });
      } catch {
        toast.error(error.message || "Sync failed", { duration: 12000 });
      }
      return;
    }
    if (data?.failures?.length) {
      toast.warning(`Synced ${data.synced} of ${data.totalContacts} contacts to Brevo. ${data.failures.length} failed.`);
    } else {
      toast.success(`${data?.synced || 0} alliance contacts synced to Brevo CRM (${data?.listName}).`);
    }
  };



  // The address every outreach letter should be sent from.
  const senderEmail =
    (draftSignature || DEFAULT_SIGNATURE).match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ||
    "jan@globalartistregistry.org";


  // Guarantee the letter always ends with the sender block (name + email), so
  // recipients can see who wrote and how to reply even when the mail app shows
  // no From address in the compose window.
  const withSignature = (body: string) => {
    const sig = (draftSignature || DEFAULT_SIGNATURE).trim();
    if (!sig) return body;
    const sigEmail = sig.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
    if (sigEmail && body.includes(sigEmail)) return body;
    return `${body.trimEnd()}\n\n${sig}`;
  };

  const readyBatch = batchResults.filter(r => r.body && r.email);

  const copyBatchDraft = async (r: { email: string; subject: string; body: string }) => {
    await navigator.clipboard.writeText(formatCopyBlock({
      email: r.email,
      subject: r.subject || "",
      body: markdownToPlainText(r.body),
      signature: draftSignature,
    }));
    toast.success("Draft copied to clipboard");
  };

  const copyAllBatchDrafts = async () => {
    const text = formatCopyBlocks(batchResults.filter(r => r.body).map(r => ({
      email: r.email,
      subject: r.subject || "",
      body: markdownToPlainText(r.body),
      signature: draftSignature,
    })));
    await navigator.clipboard.writeText(text);
    toast.success("All letters copied to clipboard");
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
          <Button variant="outline" onClick={findExistingDuplicates} disabled={dupScanRunning || loading}>
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            {dupScanRunning ? "Scanning…" : "Find duplicates"}
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
                {duplicates.length > 0 && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      Possible duplicate{duplicates.length > 1 ? "s" : ""} already in the list
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {duplicates.map(d => (
                        <li key={d.id}>
                          {d.name}
                          {d.country ? ` · ${d.country}` : ""}
                          {d.contact_email ? ` · ${d.contact_email}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
          {batchResults.length > 0 && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setBatchOpen(true)}>
                Reopen last batch ({batchResults.length})
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setBatchResults([]); setBatchProgress(null); toast.success("Saved batch cleared"); }}
              >
                Discard saved batch
              </Button>
            </>
          )}

          {selectedIds.length > 0 && (
            <>
              <Badge variant="secondary">{selectedIds.length} selected</Badge>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
              <Button size="sm" onClick={generateBatchDrafts} disabled={batchRunning}>
                {batchRunning ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                {pickedTextId
                  ? aiRewriteFromTemplate
                    ? `Generate from saved text for ${selectedIds.length}`
                    : `Apply saved text to ${selectedIds.length}`
                  : `Generate ${selectedIds.length} letters`}
              </Button>
              <Button size="sm" variant="outline" onClick={applyTemplateToSelected} disabled={batchRunning || !hasTemplate}>
                Use saved template for {selectedIds.length}
              </Button>
              <Button size="sm" variant="outline" onClick={applyCuratorLetterToSelected} disabled={batchRunning}>
                Curator Partner letter for {selectedIds.length}
              </Button>
              <Button size="sm" variant="outline" onClick={syncToBrevo} disabled={syncing}>
                {syncing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                Sync to Brevo
              </Button>
              {emailTexts.length > 0 && (
                <Select onValueChange={(v) => applySavedTextToSelected(v)}>
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
              {pickedTextId && (
                <div className="flex items-center rounded-md border border-border overflow-hidden">
                  <Button
                    type="button"
                    size="sm"
                    variant={aiRewriteFromTemplate ? "ghost" : "default"}
                    className="rounded-none h-7 px-2 text-[11px]"
                    onClick={() => setAiRewriteFromTemplate(false)}
                  >
                    Verbatim
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={aiRewriteFromTemplate ? "default" : "ghost"}
                    className="rounded-none h-7 px-2 text-[11px]"
                    onClick={() => setAiRewriteFromTemplate(true)}
                  >
                    AI rewrite
                  </Button>
                </div>
              )}
            </>

          )}
          {batchResults.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setBatchOpen(true)}>
              <Mail className="w-3.5 h-3.5 mr-1" /> Review {batchResults.length} drafts
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">
            Letters are sent in-app from {senderEmail} — no Outlook drafts involved.
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
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>
              Batch letters {batchProgress ? `— ${batchProgress.done}/${batchProgress.total}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm overflow-y-auto px-6 flex-1 min-h-0">

            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">How these letters are sent</p>
              <p>
                Review and edit the letters here, then use <strong>“Send N letters now”</strong> at the bottom. Letters are sent by GARF’s own mail service from <span className="font-mono">{senderEmail}</span> — no Outlook window opens, so no empty drafts are created.
              </p>
              <p>
                Nothing is routed through Outlook any more, so no empty drafts can appear. Use <strong>Copy text</strong> if you ever need a letter outside the app.
              </p>
              <p>
                This batch is also stored temporarily in this browser, so you can close this window or refresh and reopen it later.
              </p>
            </div>
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
            <div className="border border-border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs font-medium">Outlook account used for drafts</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={checkOutlookAccount} disabled={checkingAccount}>
                    {checkingAccount ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                    Check account
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setForceReauthOpen(true)}>
                    Force re-authenticate
                  </Button>
                </div>
              </div>
              {outlookAccount ? (
                <p className="text-xs text-muted-foreground">
                  Connected as <span className="font-mono">{outlookAccount.address || "unknown"}</span>
                  {outlookAccount.displayName ? ` (${outlookAccount.displayName})` : ""} —{" "}
                  {outlookAccount.accountType === "personal"
                    ? "this is a personal Outlook.com mailbox, not your Microsoft 365 work account."
                    : "this is a Microsoft 365 work/school mailbox."}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Click “Check account” to see which mailbox the connector is currently authorised for.
                </p>
              )}
            </div>

            {draftLinks.length > 0 && (
              <div className="border border-border rounded-md p-3 space-y-2 bg-muted/40">
                <div className="text-xs font-medium">
                  {draftLinks.length} drafts saved{draftMailbox ? ` in mailbox ${draftMailbox}` : ""}
                </div>
                <p className="text-xs text-muted-foreground">
                  If they don’t appear in your Outlook app, open them directly — these links go to the exact mailbox they were saved in.
                </p>
                <ul className="space-y-1">
                  {draftLinks.map((l, i) => (
                    <li key={l.webLink} className="text-xs">
                      <a
                        href={l.webLink}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:no-underline"
                      >
                        {i + 1}. {l.subject || l.to}
                      </a>
                      <span className="text-muted-foreground"> — {l.to}</span>
                    </li>
                  ))}
                </ul>
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
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" disabled={!r.body} onClick={() => copyBatchDraft(r)}>
                    Copy for Outlook
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-wrap gap-2 border-t border-border bg-background px-6 py-4">

            <Button variant="outline" onClick={copyAllBatchDrafts} disabled={batchRunning || batchResults.length === 0}>
              Copy all letters
            </Button>
            <Button variant="outline" onClick={saveBatchEdits} disabled={batchRunning || batchResults.length === 0}>
              Save edits
            </Button>

            <Button variant="outline" onClick={markBatchContacted} disabled={batchRunning || batchResults.length === 0}>
              Mark as contacted
            </Button>
            <Button
              onClick={sendBatchViaBrevo}
              disabled={batchRunning || readyBatch.length === 0}
            >
              {batchRunning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Mail className="w-4 h-4 mr-1.5" />}
              Send {readyBatch.length} letter{readyBatch.length === 1 ? "" : "s"} now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!draftTarget} onOpenChange={(o) => !o && setDraftTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Email draft — {draftTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto px-6 flex-1 min-h-0">

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
                {draftGenerating
                  ? "Generating…"
                  : pickedTextId
                    ? aiRewriteFromTemplate
                      ? "Generate from saved text"
                      : "Apply saved text"
                    : draftTarget?.email_body ? "Regenerate" : "Generate"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={pickedTextId} onValueChange={applySavedTextToDraft}>
                <SelectTrigger className="w-[300px] h-9 text-sm">
                  <SelectValue placeholder={emailTexts.length ? "Insert saved email text…" : "No saved email texts yet"} />
                </SelectTrigger>
                <SelectContent>
                  {[...emailTexts]
                    .sort((a, b) => {
                      const cat = draftTarget?.category;
                      const score = (t: OutreachEmailText) => (t.category === cat ? 0 : t.category ? 2 : 1);
                      return score(a) - score(b) || a.name.localeCompare(b.name);
                    })
                    .map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}{t.category ? ` — ${CATEGORY_LABELS[t.category as Category] || t.category}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {pickedTextId && (
                <div className="flex items-center rounded-md border border-border overflow-hidden">
                  <Button
                    type="button"
                    size="sm"
                    variant={aiRewriteFromTemplate ? "ghost" : "default"}
                    className="rounded-none h-8 px-2 text-xs"
                    onClick={() => setAiRewriteFromTemplate(false)}
                  >
                    Apply verbatim
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={aiRewriteFromTemplate ? "default" : "ghost"}
                    className="rounded-none h-8 px-2 text-xs"
                    onClick={() => setAiRewriteFromTemplate(true)}
                  >
                    Generate from text
                  </Button>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setTextsOpen(true)}>
                <FileText className="w-4 h-4 mr-1.5" />Manage email texts
              </Button>

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
              <div className="flex items-center justify-between">
                <Label>Body</Label>
                <Button
                  type="button" size="sm" variant={draftPreview ? "default" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setDraftPreview(p => !p)}
                >
                  {draftPreview ? "Edit" : "Preview"}
                </Button>
              </div>
              {draftPreview ? (
                <div
                  className="min-h-[280px] rounded-md border border-input bg-background p-3 text-sm prose-email"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(draftBody) }}
                />
              ) : (
                <Textarea rows={14} value={draftBody} onChange={e => setDraftBody(e.target.value)} placeholder="Email body — generate with AI, or reuse your saved template. **bold**, *italic*, ## heading, - bullet." />
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Formatting: **bold**, *italic*, ## heading, - bullet — preserved in the exported Outlook draft.
              </p>
            </div>


            {draftTarget?.email_generated_at && (
              <p className="text-xs text-muted-foreground">
                Last generated {new Date(draftTarget.email_generated_at).toLocaleString()}
              </p>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2 border-t border-border bg-background px-6 py-4">
            <Button variant="outline" onClick={copyDraft} disabled={!draftBody}>
              <Copy className="w-4 h-4 mr-1.5" />Copy
            </Button>
            <Button variant="outline" onClick={saveDraft} disabled={!draftBody && !draftSubject}>Save draft</Button>
            <Button onClick={sendDraftViaBrevo} disabled={sendingDraft || !draftBody || !draftTarget?.contact_email}>
              {sendingDraft ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Mail className="w-4 h-4 mr-1.5" />}
              Send now
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <Dialog open={dupScanOpen} onOpenChange={setDupScanOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Duplicate targets {dupGroups.length > 0 ? `— ${dupGroups.length} group${dupGroups.length === 1 ? "" : "s"}` : ""}
            </DialogTitle>
          </DialogHeader>
          {dupGroups.length === 0 ? (
            <p className="text-muted-foreground text-sm">No duplicate targets found.</p>
          ) : (
            <div className="space-y-4">
              {dupGroups.map((g, i) => (
                <div key={g.key} className="border border-border rounded-md p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <Badge variant="outline">{g.reason}</Badge>
                  </div>
                  <ul className="space-y-2">
                    {g.items.map(t => (
                      <li key={t.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{t.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {CATEGORY_LABELS[t.category]}
                            {t.country ? ` · ${t.country}` : ""}
                            {t.contact_email ? ` · ${t.contact_email}` : ""}
                            {t.website ? ` · ${t.website}` : ""}
                          </div>
                          {t.notes && <div className="text-xs text-muted-foreground mt-0.5">{t.notes}</div>}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-destructive"
                          onClick={() => remove(t.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupScanOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OutreachEmailTextsDialog

        open={textsOpen}
        onOpenChange={setTextsOpen}
        templates={emailTexts}
        categoryLabels={CATEGORY_LABELS}
        categories={CATEGORIES}
        onChanged={loadEmailTexts}
      />

      <Dialog open={forceReauthOpen} onOpenChange={setForceReauthOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Force re-authenticate Outlook</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Microsoft reuses the browser session, so the account picker often re-authorises the same mailbox
              silently. Do these steps in order to force a genuinely fresh authorisation:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Sign out of every Microsoft session first:{" "}
                <a
                  href="https://login.microsoftonline.com/common/oauth2/v2.0/logout"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:no-underline"
                >
                  login.microsoftonline.com logout
                </a>
                {" "}— or open the next step in a private/incognito window.
              </li>
              <li>
                In Lovable, open <span className="font-medium">Settings → Connectors → All connectors → Microsoft
                Outlook → Add connection</span> (do not click either existing Outlook card).
              </li>
              <li>
                On the Microsoft sign-in screen choose <span className="font-medium">“Work or school account”</span>{" "}
                and sign in with your Microsoft 365 address.
              </li>
              <li>Come back here and click “Check account” to confirm the mailbox before saving drafts.</li>
            </ol>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setForceReauthOpen(false)}>Close</Button>
            <Button
              onClick={async () => {
                await checkOutlookAccount();
              }}
              disabled={checkingAccount}
            >
              {checkingAccount ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Re-check account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>

  );
}
