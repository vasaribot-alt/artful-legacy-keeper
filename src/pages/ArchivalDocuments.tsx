import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOwner } from "@/hooks/use-active-owner";
import { AppLayout } from "@/components/AppLayout";
import { RegistrarWorkspaceLayout } from "@/components/RegistrarWorkspaceLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArchivalDocumentViewer, type ArchivalDocument } from "@/components/ArchivalDocumentViewer";
import { DOCUMENT_TYPES, DEFAULT_DOCUMENT_VISIBILITY, canPublishDocument, validArchivalDate } from "@/lib/archivalDocuments";
import { assertWithinQuota } from "@/lib/storageQuota";
import { Plus, FileText, Pencil, Trash2, Globe, Lock } from "lucide-react";
import { toast } from "sonner";

export default function ArchivalDocuments() {
  const { ownerId, authUserId, isRegistrarContext, loading: ownerLoading } = useActiveOwner();
  const [documents, setDocuments] = useState<ArchivalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ArchivalDocument | null>(null);
  const [selected, setSelected] = useState<ArchivalDocument | null>(null);
  const [deleting, setDeleting] = useState<ArchivalDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Other");
  const [date, setDate] = useState("");
  const [context, setContext] = useState("");
  const [creator, setCreator] = useState("");
  const [rights, setRights] = useState("");
  const [isPublic, setIsPublic] = useState(DEFAULT_DOCUMENT_VISIBILITY);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const load = async () => {
    if (!ownerId) return;
    setLoading(true);
    const [{ data: roles }, { data, error }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", ownerId),
      supabase.from("archival_documents").select("*").eq("owner_id", ownerId).eq("role_context", "artist").order("document_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    ]);
    setAllowed((roles ?? []).some(r => r.role === "artist")); setDocuments(data ?? []); setError(!!error); setLoading(false);
  };
  useEffect(() => { if (ownerId) void load(); else if (!ownerLoading) setLoading(false); }, [ownerId, ownerLoading]);
  const reset = (d: ArchivalDocument | null = null) => { setEditing(d); setTitle(d?.title ?? ""); setType(d?.document_type ?? "Other"); setDate(d?.document_date ?? ""); setContext(d?.context ?? ""); setCreator(d?.creator ?? ""); setRights(d?.rights_note ?? ""); setIsPublic(d?.is_public ?? DEFAULT_DOCUMENT_VISIBILITY); setFile(null); setOpen(true); };
  const save = async () => {
    if (!ownerId || !title.trim()) return;
    if (!validArchivalDate(date)) { toast.error("Use a year, YYYY-MM or YYYY-MM-DD."); return; }
    if (!editing && !file) { toast.error("Choose a document file."); return; }
    setSaving(true); let uploaded = "";
    try {
      let path = editing?.storage_path ?? "";
      if (file && !editing) {
        if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a PDF, JPEG, PNG or WebP file.");
        await assertWithinQuota(ownerId, file.size);
        path = `${ownerId}/artist/${crypto.randomUUID()}/document.${file.type === "application/pdf" ? "pdf" : file.type.split("/")[1]}`;
        const { error } = await supabase.storage.from("archival-documents").upload(path, file); if (error) throw error; uploaded = path;
      }
      const metadata = { title: title.trim(), document_type: type, document_date: date || null, context: context.trim() || null, creator: creator.trim() || null, rights_note: rights.trim() || null, ...(canPublishDocument(ownerId, authUserId) ? { is_public: isPublic } : {}) };
      const result = editing ? await supabase.from("archival_documents").update(metadata).eq("id", editing.id).eq("owner_id", ownerId).eq("role_context", "artist") : await supabase.from("archival_documents").insert({ ...metadata, owner_id: ownerId, role_context: "artist", storage_path: path, file_name: file?.name ?? "", file_type: file?.type ?? "", file_size: file?.size ?? 0 });
      if (result.error) throw result.error;
      setOpen(false); toast.success("Archival document saved"); void load();
    } catch (e) { if (uploaded) await supabase.storage.from("archival-documents").remove([uploaded]); toast.error(e instanceof Error ? e.message : "Unable to save document."); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleting || !ownerId) return; setSaving(true);
    try {
      const { error } = await supabase.storage.from("archival-documents").remove([deleting.storage_path]); if (error) throw error;
      const result = await supabase.from("archival_documents").delete().eq("id", deleting.id).eq("owner_id", ownerId).eq("role_context", "artist"); if (result.error) throw result.error;
      setDeleting(null); toast.success("Document deleted"); void load();
    } catch { toast.error("Unable to delete document. Please retry."); } finally { setSaving(false); }
  };
  const actions = allowed && <Button size="sm" onClick={() => reset()}><Plus className="h-4 w-4 mr-2" />Add Document</Button>;
  const content = <><div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
    <div className="flex flex-wrap gap-3 items-center"><Input autoComplete="off" aria-label="Search archival documents" placeholder="Search title, reference or context" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" /><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-48" aria-label="Filter document type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All document types</SelectItem>{DOCUMENT_TYPES.map(t => <SelectItem value={t} key={t}>{t}</SelectItem>)}</SelectContent></Select>{ownerId && <Button variant="outline" asChild><Link to={`/artist/${ownerId}/documents`} target="_blank">Public archive</Link></Button>}</div>
    {loading ? <p role="status">Loading…</p> : error ? <div role="alert"><p>Unable to load documents.</p><Button variant="outline" onClick={load}>Retry</Button></div> : !allowed ? <p>Archival documents belong to the artist archive.</p> : !documents.length ? <div className="text-center py-16"><FileText className="w-10 h-10 mx-auto text-muted-foreground mb-4" /><h2 className="font-serif text-2xl">No archival documents yet</h2></div> : <div className="space-y-4">{documents.filter(d => (filter === "all" || d.document_type === filter) && `${d.title} ${d.reference_number} ${d.context ?? ""} ${d.document_date ?? ""}`.toLowerCase().includes(search.toLowerCase())).map(d => <article key={d.id} className="border border-border rounded-sm p-5 space-y-3">
      <div className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><p className="text-xs font-mono text-muted-foreground">{d.reference_number}</p><h2 className="text-xl font-serif break-words mt-1">{d.title}</h2><p className="text-xs text-muted-foreground mt-1">{d.document_type}{d.document_date ? ` · ${d.document_date}` : ""}</p></div><span className="text-xs text-muted-foreground flex gap-1 items-center">{d.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}{d.is_public ? "Public" : "Private"}</span></div>
      {d.context && <p className="text-sm whitespace-pre-wrap break-words">{d.context}</p>}
      <div className="flex gap-1"><Button variant="outline" onClick={() => setSelected(d)}><FileText className="h-4 w-4 mr-2" />View document</Button><Button variant="ghost" size="icon" title="Edit document" aria-label={`Edit ${d.title}`} onClick={() => reset(d)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Delete document" aria-label={`Delete ${d.title}`} onClick={() => setDeleting(d)}><Trash2 className="h-4 w-4" /></Button></div>
    </article>)}</div>}
    </div><Dialog open={open} onOpenChange={v => { if (!saving) setOpen(v); }}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Edit Archival Document" : "Add Archival Document"}</DialogTitle><DialogDescription>{editing?.reference_number ?? "Reference assigned when saved"}</DialogDescription></DialogHeader>
      <form autoComplete="off" className="space-y-4" onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={saving} className="space-y-4">
        <div><Label htmlFor="archive-title">Title *</Label><Input autoComplete="off" id="archive-title" required value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div className="grid sm:grid-cols-2 gap-4"><div><Label>Document type</Label><Select value={type} onValueChange={setType}><SelectTrigger aria-label="Document type"><SelectValue /></SelectTrigger><SelectContent>{DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="archive-date">Date / year</Label><Input autoComplete="off" id="archive-date" placeholder="1992 or 1992-06-15" value={date} onChange={e => setDate(e.target.value)} /></div></div>
        <div><Label htmlFor="archive-context">Context</Label><Textarea autoComplete="off" id="archive-context" rows={5} value={context} onChange={e => setContext(e.target.value)} /></div>
        <div><Label htmlFor="archive-creator">Creator / source</Label><Input autoComplete="off" id="archive-creator" value={creator} onChange={e => setCreator(e.target.value)} /></div>
        <div><Label htmlFor="archive-rights">Rights / permissions</Label><Textarea autoComplete="off" id="archive-rights" value={rights} onChange={e => setRights(e.target.value)} /></div>
        {!editing && <div><Label htmlFor="archive-file">Document file (PDF or image) *</Label><Input id="archive-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>}
        {ownerId && canPublishDocument(ownerId, authUserId) ? <div className="space-y-2"><div className="flex items-center gap-3"><Switch id="archive-public" checked={isPublic} onCheckedChange={setIsPublic} /><Label htmlFor="archive-public">Publicly visible</Label></div>{isPublic && <p className="text-xs text-muted-foreground">Only publish material you have permission to share, including personal information and photographs of others.</p>}</div> : <p className="text-xs text-muted-foreground">Only the artist can change public visibility.</p>}
      </fieldset><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Document"}</Button></div></form>
    </DialogContent></Dialog><ArchivalDocumentViewer document={selected} onClose={() => setSelected(null)} />
    <Dialog open={!!deleting} onOpenChange={v => { if (!v && !saving) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Delete archival document?</DialogTitle><DialogDescription>The file and its contextual record will be permanently removed.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={saving} onClick={remove}>Delete</Button></div></DialogContent></Dialog>
  </>;
  return isRegistrarContext ? <RegistrarWorkspaceLayout headerActions={actions}>{content}</RegistrarWorkspaceLayout> : <AppLayout title="Archival Documents" headerActions={actions}>{content}</AppLayout>;
}