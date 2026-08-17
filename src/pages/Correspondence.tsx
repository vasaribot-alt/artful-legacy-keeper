import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Mail, Upload, Search, Paperclip, Loader2, Lock, Clock, Trash2, Link2, Sparkles, ChevronRight, Download, X,
} from "lucide-react";
import { assertWithinQuota, QuotaExceededError, formatBytes } from "@/lib/storageQuota";
import { CorrespondenceLinkEditor } from "@/components/CorrespondenceLinkEditor";

interface ImportRow {
  id: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  status: string;
  message_count: number;
  ingested_count: number;
  attachment_bytes: number;
  date_from: string | null;
  date_to: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  sent_at: string | null;
  from_name: string | null;
  from_email: string | null;
  to_emails: string[];
  cc_emails: string[];
  subject: string | null;
  body_text: string | null;
  has_attachments: boolean;
  thread_key: string | null;
  visibility: string;
  embargo_until_year: number | null;
}

interface AnalysisSummary {
  correspondents: Record<string, number>;
  attachment_bytes: number;
  attachment_count: number;
  min_date: string | null;
  max_date: string | null;
  undated: number;
  total: number;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Undated";

export default function Correspondence() {
  const [userId, setUserId] = useState<string | null>(null);
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);

  // upload / wizard
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [wizardImport, setWizardImport] = useState<ImportRow | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Defaults come from the analysis; they are only sent as filters if the artist narrows them.
  const [defaultRange, setDefaultRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [skipAttachments, setSkipAttachments] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // search
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const [results, setResults] = useState<MessageRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);

  const [open, setOpen] = useState<MessageRow | null>(null);

  const loadImports = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("correspondence_imports")
      .select("*")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false });
    setImports((data ?? []) as ImportRow[]);
  }, []);

  const runSearch = useCallback(async (uid: string) => {
    setSearching(true);
    let q = supabase
      .from("correspondence_messages")
      .select("id, sent_at, from_name, from_email, to_emails, cc_emails, subject, body_text, has_attachments, thread_key, visibility, embargo_until_year", { count: "exact" })
      .eq("owner_id", uid)
      .order("sent_at", { ascending: false, nullsFirst: false })
      .limit(200);

    const trimmed = query.trim();
    if (trimmed) q = q.textSearch("search_tsv", trimmed.split(/\s+/).join(" & "), { config: "simple" });
    if (person.trim()) {
      const p = `%${person.trim()}%`;
      q = q.or(`from_email.ilike.${p},from_name.ilike.${p}`);
    }
    if (yearFilter !== "all") {
      q = q.gte("sent_at", `${yearFilter}-01-01`).lt("sent_at", `${Number(yearFilter) + 1}-01-01`);
    }
    if (attachmentsOnly) q = q.eq("has_attachments", true);

    const { data, error, count } = await q;
    if (error) toast.error("Search failed", { description: error.message });
    setResults((data ?? []) as MessageRow[]);
    setTotalMessages(count ?? 0);
    setSearching(false);
  }, [query, person, yearFilter, attachmentsOnly]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        await Promise.all([loadImports(uid), runSearch(uid)]);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => runSearch(userId), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, person, yearFilter, attachmentsOnly, userId]);

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) if (r.sent_at) set.add(String(new Date(r.sent_at).getFullYear()));
    return Array.from(set).sort().reverse();
  }, [results]);

  // ---------- upload + analyze ----------
  const handleFile = async (file: File) => {
    if (!userId) return;
    const name = file.name.toLowerCase();
    if (!/\.(mbox|eml|zip|txt)$/.test(name)) {
      toast.error("Unsupported file", { description: "Upload a .mbox, .eml, or .zip of .eml files." });
      return;
    }
    setUploading(true);
    setProgress("Uploading…");
    try {
      await assertWithinQuota(userId, file.size);
      const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("correspondence-originals")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: imp, error: impErr } = await supabase
        .from("correspondence_imports")
        .insert({ owner_id: userId, file_name: file.name, file_size: file.size, storage_path: path, status: "uploaded" })
        .select("*")
        .single();
      if (impErr) throw impErr;

      // analyze in chunks
      const merged: AnalysisSummary = { correspondents: {}, attachment_bytes: 0, attachment_count: 0, min_date: null, max_date: null, undated: 0, total: 0 };
      let offset = 0;
      let done = false;
      while (!done) {
        setProgress(`Reading messages… ${offset || ""}`);
        const { data, error } = await supabase.functions.invoke("parse-correspondence", {
          body: { import_id: imp.id, action: "analyze", offset },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const s = data.summary as AnalysisSummary;
        for (const [k, v] of Object.entries(s.correspondents)) merged.correspondents[k] = (merged.correspondents[k] ?? 0) + v;
        merged.attachment_bytes += s.attachment_bytes;
        merged.attachment_count += s.attachment_count;
        merged.undated += s.undated;
        if (s.min_date && (!merged.min_date || s.min_date < merged.min_date)) merged.min_date = s.min_date;
        if (s.max_date && (!merged.max_date || s.max_date > merged.max_date)) merged.max_date = s.max_date;
        merged.total = data.total;
        offset = data.processed_to;
        done = data.done;
      }
      setAnalysis(merged);
      const defFrom = merged.min_date ? merged.min_date.slice(0, 10) : "";
      const defTo = merged.max_date ? merged.max_date.slice(0, 10) : "";
      setDateFrom(defFrom);
      setDateTo(defTo);
      setDefaultRange({ from: defFrom, to: defTo });
      setExcluded(new Set());
      setSkipAttachments(false);
      setAcknowledged(false);
      setWizardImport(imp as ImportRow);
      await loadImports(userId);
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        toast.error("Storage quota exceeded", { description: "Upgrade your storage tier to deposit this mailbox." });
      } else {
        toast.error("Upload failed", { description: e instanceof Error ? e.message : "Unknown error" });
      }
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const runIngest = async () => {
    if (!wizardImport || !userId) return;
    setUploading(true);
    try {
      let offset = 0;
      let done = false;
      let inserted = 0;
      let filteredOut = 0;
      let duplicates = 0;
      const warnings = new Set<string>();
      const narrowedFrom = dateFrom && dateFrom !== defaultRange.from ? dateFrom : null;
      const narrowedTo = dateTo && dateTo !== defaultRange.to ? `${dateTo}T23:59:59Z` : null;
      while (!done) {
        setProgress(`Preserving messages… ${inserted}`);
        const { data, error } = await supabase.functions.invoke("parse-correspondence", {
          body: {
            import_id: wizardImport.id,
            action: "ingest",
            offset,
            filters: {
              date_from: narrowedFrom,
              date_to: narrowedTo,
              exclude_emails: Array.from(excluded),
              skip_attachments: skipAttachments,
            },
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        inserted += data.inserted ?? 0;
        filteredOut += data.skipped_filtered ?? 0;
        duplicates += data.skipped_duplicate ?? 0;
        (data.warnings ?? []).forEach((w: string) => warnings.add(w));
        offset = data.processed_to;
        done = data.done;
      }
      const detail = [
        filteredOut ? `${filteredOut} left out by your filters` : null,
        duplicates ? `${duplicates} already archived` : null,
      ].filter(Boolean).join(" · ");
      toast.success(`${inserted} messages preserved`, { description: detail || undefined });
      warnings.forEach((w) => toast.warning(w));
      setWizardImport(null);
      setAnalysis(null);
      await Promise.all([loadImports(userId), runSearch(userId)]);
    } catch (e) {
      toast.error("Import failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const suggestLinks = async () => {
    setProgress("Matching messages to artworks…");
    try {
      const { data, error } = await supabase.functions.invoke("suggest-correspondence-links", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.suggested} suggested links from ${data.scanned} messages`);
    } catch (e) {
      toast.error("Could not generate suggestions", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setProgress(null);
    }
  };

  const deleteImport = async (imp: ImportRow) => {
    if (!userId) return;
    if (!confirm(`Delete "${imp.file_name}" and all ${imp.ingested_count} messages preserved from it?`)) return;
    const { data: msgs } = await supabase.from("correspondence_messages").select("id").eq("import_id", imp.id);
    const ids = (msgs ?? []).map((m) => m.id);
    if (ids.length) await supabase.from("correspondence_messages").delete().in("id", ids);
    if (imp.storage_path) await supabase.storage.from("correspondence-originals").remove([imp.storage_path]);
    await supabase.from("correspondence_imports").delete().eq("id", imp.id);
    toast.success("Deposit deleted");
    await Promise.all([loadImports(userId), runSearch(userId)]);
  };

  const topCorrespondents = useMemo(() => {
    if (!analysis) return [];
    return Object.entries(analysis.correspondents).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [analysis]);

  const hasArchive = imports.some((i) => i.ingested_count > 0) || totalMessages > 0;

  return (
    <AppLayout title="Correspondence">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-serif tracking-tight mb-2">Correspondence</h1>
          <p className="text-muted-foreground max-w-3xl">
            Letters and emails explain the works. Deposit your mail archive here to preserve it alongside the artworks —
            searchable, and linked to the pieces and exhibitions it discusses. Everything is private to you and the
            registrars you have approved.
          </p>
        </header>

        {/* Deposit */}
        <section className="mb-10 border border-border rounded-sm p-5 bg-card">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="max-w-2xl">
              <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Deposit a mail archive</h2>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li><span className="text-foreground">Gmail</span> — Google Takeout → select Mail → download the <code>.mbox</code> file.</li>
                <li><span className="text-foreground">Outlook / Apple Mail</span> — select messages and drag them out to a folder, then zip the <code>.eml</code> files.</li>
                <li><span className="text-foreground">Single letters</span> — upload individual <code>.eml</code> files.</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Nothing is stored until you review what the file contains and choose what to keep. The original file is
                preserved untouched as archival evidence.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label>
                <input
                  type="file"
                  accept=".mbox,.eml,.zip,.txt"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
                />
                <Button asChild disabled={uploading} className="cursor-pointer">
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? "Working…" : "Choose file"}
                  </span>
                </Button>
              </label>
              {hasArchive && (
                <Button variant="outline" size="sm" onClick={suggestLinks} disabled={!!progress}>
                  <Sparkles className="w-3.5 h-3.5" /> Suggest artwork links
                </Button>
              )}
            </div>
          </div>
          {progress && <div className="mt-3 text-xs text-muted-foreground">{progress}</div>}
        </section>

        {/* Deposits list */}
        {imports.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">Deposits</h2>
            <div className="border border-border rounded-sm divide-y divide-border">
              {imports.map((i) => (
                <div key={i.id} className="p-3 flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{i.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.ingested_count.toLocaleString()} of {i.message_count.toLocaleString()} messages preserved
                      {" · "}{formatBytes(Number(i.file_size))}
                      {i.date_from && <> · {fmtDate(i.date_from)} – {fmtDate(i.date_to)}</>}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">{i.status}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => deleteImport(i)} aria-label="Delete deposit">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search */}
        <section>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search subjects and message text…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Input className="w-48" placeholder="Person or address" value={person} onChange={(e) => setPerson(e.target.value)} />
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant={attachmentsOnly ? "default" : "outline"} size="sm" onClick={() => setAttachmentsOnly((v) => !v)}>
              <Paperclip className="w-3.5 h-3.5" /> Attachments
            </Button>
          </div>

          <div className="text-xs text-muted-foreground mb-3">
            {searching ? "Searching…" : `${totalMessages.toLocaleString()} ${totalMessages === 1 ? "message" : "messages"}`}
          </div>

          {loading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 bg-secondary animate-pulse rounded-sm" />)}</div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-sm">
              <Mail className="w-6 h-6 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No correspondence yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Deposit a mail export above to begin the archive.</p>
            </div>
          ) : (
            <div className="border border-border rounded-sm divide-y divide-border">
              {results.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setOpen(m)}
                  className="w-full text-left p-3 hover:bg-secondary/50 transition-colors flex items-start gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{m.subject || "(no subject)"}</span>
                      {m.has_attachments && <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />}
                      {m.visibility === "embargoed" && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />{m.embargo_until_year}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {m.from_name || m.from_email || "Unknown sender"}
                      {m.to_emails?.length ? ` → ${m.to_emails.slice(0, 2).join(", ")}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{fmtDate(m.sent_at)}</div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground mt-10 max-w-3xl flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Correspondence is never published. Mail archives contain third parties who have not consented — keep material
          out that does not belong in an art-historical record, and use the embargo year for material intended only for
          future scholarship.
        </p>
      </div>

      {/* Review / selective ingest */}
      <Dialog open={!!wizardImport} onOpenChange={(o) => { if (!o && !uploading) { setWizardImport(null); setAnalysis(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review before preserving</DialogTitle>
            <DialogDescription>
              {analysis?.total.toLocaleString()} messages found
              {analysis?.min_date && <> · {fmtDate(analysis.min_date)} – {fmtDate(analysis.max_date)}</>}
              {analysis ? ` · ${formatBytes(analysis.attachment_bytes)} of attachments (${analysis.attachment_count})` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Keep from</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Keep until</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-2">
                Exclude correspondents (bank, family, anything private)
              </div>
              <div className="border border-border rounded-sm max-h-56 overflow-y-auto divide-y divide-border">
                {topCorrespondents.map(([email, count]) => (
                  <label key={email} className="flex items-center gap-2 p-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={excluded.has(email)}
                      onCheckedChange={(c) => {
                        setExcluded((prev) => {
                          const next = new Set(prev);
                          if (c) next.add(email); else next.delete(email);
                          return next;
                        });
                      }}
                    />
                    <span className="truncate flex-1">{email}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={skipAttachments} onCheckedChange={(c) => setSkipAttachments(!!c)} />
              Skip attachments (text only — much smaller)
            </label>

            <label className="flex items-start gap-2 text-xs text-muted-foreground border border-border rounded-sm p-3">
              <Checkbox checked={acknowledged} onCheckedChange={(c) => setAcknowledged(!!c)} className="mt-0.5" />
              <span>
                I confirm I have the right to deposit this correspondence, that it is stored privately for archival and
                art-historical purposes, and that I will keep out material concerning third parties that does not belong
                in an art-historical record.
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setWizardImport(null); setAnalysis(null); }} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={runIngest} disabled={!acknowledged || uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {uploading ? progress ?? "Working…" : "Preserve selected messages"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {open && <MessageReader message={open} onClose={() => setOpen(null)} onChanged={() => userId && runSearch(userId)} />}
    </AppLayout>
  );
}

/* ------------------------------- Reader ------------------------------- */

interface AttachmentRow {
  id: string;
  file_name: string;
  mime_type: string | null;
  file_size: number;
  storage_path: string;
}

function MessageReader({ message, onClose, onChanged }: { message: MessageRow; onClose: () => void; onChanged: () => void }) {
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [thread, setThread] = useState<MessageRow[]>([]);
  const [visibility, setVisibility] = useState(message.visibility);
  const [embargo, setEmbargo] = useState(message.embargo_until_year ? String(message.embargo_until_year) : "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const [att, th] = await Promise.all([
        supabase.from("correspondence_attachments").select("id, file_name, mime_type, file_size, storage_path").eq("message_id", message.id),
        message.thread_key
          ? supabase
              .from("correspondence_messages")
              .select("id, sent_at, from_name, from_email, to_emails, cc_emails, subject, body_text, has_attachments, thread_key, visibility, embargo_until_year")
              .eq("thread_key", message.thread_key)
              .order("sent_at", { ascending: true })
          : Promise.resolve({ data: [] as MessageRow[] }),
      ]);
      setAttachments((att.data ?? []) as AttachmentRow[]);
      setThread(((th as { data: MessageRow[] | null }).data ?? []) as MessageRow[]);
    })();
  }, [message.id, message.thread_key]);

  const download = async (a: AttachmentRow) => {
    const { data, error } = await supabase.storage.from("correspondence-attachments").createSignedUrl(a.storage_path, 300, { download: a.file_name });
    if (error || !data?.signedUrl) { toast.error("Could not open attachment"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const saveAccess = async () => {
    const year = embargo ? Number(embargo) : null;
    const { error } = await supabase
      .from("correspondence_messages")
      .update({
        visibility,
        embargo_until_year: visibility === "embargoed" ? year : null,
        notes: notes || null,
      })
      .eq("id", message.id);
    if (error) { toast.error("Could not save", { description: error.message }); return; }
    toast.success("Saved");
    onChanged();
  };

  const remove = async () => {
    if (!confirm("Delete this message from the archive?")) return;
    const { error } = await supabase.from("correspondence_messages").delete().eq("id", message.id);
    if (error) { toast.error("Could not delete", { description: error.message }); return; }
    toast.success("Message deleted");
    onChanged();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">{message.subject || "(no subject)"}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-xs space-y-0.5">
              <div>From: {message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email}</div>
              {message.to_emails?.length > 0 && <div>To: {message.to_emails.join(", ")}</div>}
              {message.cc_emails?.length > 0 && <div>Cc: {message.cc_emails.join(", ")}</div>}
              <div>{fmtDate(message.sent_at)}</div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed border-t border-border pt-4">
          {message.body_text || "(no text body)"}
        </pre>

        {attachments.length > 0 && (
          <div className="border-t border-border pt-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Attachments</div>
            <div className="space-y-1">
              {attachments.map((a) => (
                <button key={a.id} onClick={() => download(a)} className="flex items-center gap-2 text-sm hover:underline w-full text-left">
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate flex-1">{a.file_name}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(Number(a.file_size))}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5" /> Linked records
          </div>
          <CorrespondenceLinkEditor messageId={message.id} />
        </div>

        {thread.length > 1 && (
          <div className="border-t border-border pt-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Thread ({thread.length})</div>
            <div className="space-y-1">
              {thread.map((t) => (
                <div key={t.id} className={`text-xs flex gap-2 ${t.id === message.id ? "text-foreground" : "text-muted-foreground"}`}>
                  <span className="tabular-nums whitespace-nowrap">{fmtDate(t.sent_at)}</span>
                  <span className="truncate">{t.from_email}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Access</div>
          <div className="flex items-center gap-2">
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="embargoed">Embargoed until…</SelectItem>
              </SelectContent>
            </Select>
            {visibility === "embargoed" && (
              <Input className="w-28" type="number" placeholder="Year" value={embargo} onChange={(e) => setEmbargo(e.target.value)} />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Both states are private today — the embargo year is archival metadata recording when this material may be
            opened to scholarship in future.
          </p>
          <Textarea placeholder="Archival note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="w-3.5 h-3.5" /> Delete message</Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}><X className="w-3.5 h-3.5" /> Close</Button>
              <Button size="sm" onClick={saveAccess}>Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
