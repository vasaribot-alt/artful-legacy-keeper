import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOwner } from "@/hooks/use-active-owner";
import { AppLayout } from "@/components/AppLayout";
import { RegistrarWorkspaceLayout } from "@/components/RegistrarWorkspaceLayout";
import { SketchbookReader } from "@/components/SketchbookReader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BookOpen, Plus, FileText, Images, ArrowUp, ArrowDown, RotateCw, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { assertWithinQuota, formatBytes } from "@/lib/storageQuota";
import { movePage, photosToPdf, pdfPageCount, type PagePhoto } from "@/lib/sketchbookPdf";
import type { Tables } from "@/integrations/supabase/types";

type Sketchbook = Tables<"sketchbooks">;
type SavedPage = { path: string; name: string; size: number; rotation: number };
const savedPages = (book: Sketchbook) => book.pages as unknown as SavedPage[];

export default function Sketchbooks() {
  const { ownerId, isRegistrarContext, clientRole, loading: ownerLoading } = useActiveOwner();
  const [books, setBooks] = useState<Sketchbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [hasArtistRole, setHasArtistRole] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sketchbook | null>(null);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<PagePhoto[]>([]);
  const previews = useRef<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [reader, setReader] = useState<{ book: Sketchbook; url: string } | null>(null);
  const [deleting, setDeleting] = useState<Sketchbook | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!ownerId) return;
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", ownerId);
    setHasArtistRole((roles ?? []).some(r => r.role === "artist"));
    const { data, error } = await supabase.from("sketchbooks").select("*").eq("owner_id", ownerId).eq("role_context", "artist").order("created_at", { ascending: false });
    setBooks(data ?? []); setLoadError(error ? error.message : ""); setLoading(false);
  };
  useEffect(() => { if (ownerId) void load(); else if (!ownerLoading) setLoading(false); }, [ownerId, ownerLoading]);
  useEffect(() => () => { previews.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  const reset = (book: Sketchbook | null = null) => {
    previews.current.forEach(url => URL.revokeObjectURL(url)); previews.current = [];
    setEditing(book); setTitle(book?.title ?? ""); setYear(book?.year?.toString() ?? ""); setNotes(book?.notes ?? ""); setFile(null); setPhotos([]); setMode("pdf"); setStatus(""); setOpen(true);
  };
  const addPhotos = (files: FileList | null) => {
    const incoming = Array.from(files ?? []);
    if (incoming.some(f => !["image/jpeg", "image/png", "image/webp"].includes(f.type))) { toast.error("Choose JPEG, PNG or WebP page photos."); return; }
    const added = incoming.map(file => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), rotation: 0 }));
    previews.current.push(...added.map(p => p.preview));
    setPhotos(current => [...current, ...added]);
  };
  const save = async () => {
    if (!ownerId || !title.trim()) { toast.error("A title is required."); return; }
    if (year && !Number.isInteger(Number(year))) { toast.error("Enter a whole year."); return; }
    if (!editing && (mode === "pdf" ? !file : !photos.length)) { toast.error("Add a PDF or page photos."); return; }
    setSaving(true);
    const uploaded: string[] = [];
    try {
      let pdfPath = editing?.pdf_path ?? "";
      let size = editing?.file_size ?? 0;
      let count = editing?.page_count ?? 0;
      let pages = editing ? savedPages(editing) : [];
      if (!editing) {
        setStatus(mode === "photos" ? "Creating PDF…" : "Checking PDF…");
        const pdf = mode === "photos" ? await photosToPdf(photos, title.trim()) : file;
        if (!pdf) throw new Error("Choose a PDF.");
        count = await pdfPageCount(pdf);
        await assertWithinQuota(ownerId, pdf.size + (mode === "photos" ? photos.reduce((sum, p) => sum + p.file.size, 0) : 0));
        const base = `${ownerId}/artist/${crypto.randomUUID()}`;
        pdfPath = `${base}/sketchbook.pdf`; size = pdf.size; pages = [];
        const upload = async (path: string, value: File) => {
          const { error } = await supabase.storage.from("sketchbooks").upload(path, value);
          if (error) throw error;
          uploaded.push(path);
        };
        setStatus("Uploading PDF…"); await upload(pdfPath, pdf);
        if (mode === "photos") for (const [index, photo] of photos.entries()) {
          setStatus(`Uploading original page ${index + 1} / ${photos.length}…`);
          const path = `${base}/page-${index + 1}.${photo.file.type.split("/")[1]}`;
          await upload(path, photo.file);
          pages.push({ path, name: photo.file.name, size: photo.file.size, rotation: photo.rotation });
        }
      }
      setStatus("Saving…");
      const payload = { owner_id: ownerId, role_context: "artist", title: title.trim(), year: year ? Number(year) : null, notes: notes.trim() || null, pdf_path: pdfPath, file_size: size, page_count: count, pages };
      const result = editing ? await supabase.from("sketchbooks").update({ title: payload.title, year: payload.year, notes: payload.notes }).eq("id", editing.id).eq("owner_id", ownerId).eq("role_context", "artist") : await supabase.from("sketchbooks").insert(payload);
      if (result.error) throw result.error;
      toast.success("Sketchbook saved"); setOpen(false); setPhotos([]); void load();
    } catch (error) {
      if (uploaded.length) await supabase.storage.from("sketchbooks").remove(uploaded);
      toast.error(error instanceof Error ? error.message : "Unable to save sketchbook.");
    } finally { setSaving(false); setStatus(""); }
  };
  const read = async (book: Sketchbook) => {
    const { data, error } = await supabase.storage.from("sketchbooks").createSignedUrl(book.pdf_path, 3600);
    if (error || !data) { toast.error("Unable to open sketchbook."); return; }
    setReader({ book, url: data.signedUrl });
  };
  const remove = async () => {
    if (!deleting || !ownerId) return;
    setBusyDelete(true);
    try {
      const { error } = await supabase.storage.from("sketchbooks").remove([deleting.pdf_path, ...savedPages(deleting).map(p => p.path)]);
      if (error) throw error;
      const result = await supabase.from("sketchbooks").delete().eq("id", deleting.id).eq("owner_id", ownerId).eq("role_context", "artist");
      if (result.error) throw result.error;
      setDeleting(null); toast.success("Sketchbook deleted"); void load();
    } catch { toast.error("Unable to delete sketchbook. Please retry."); }
    finally { setBusyDelete(false); }
  };
  const allowed = hasArtistRole && (!isRegistrarContext || clientRole === "artist");
  const actions = allowed && <Button size="sm" onClick={() => reset()}><Plus className="h-4 w-4 mr-2" />Add Sketchbook</Button>;
  const content = <>
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <Input aria-label="Search sketchbooks" autoComplete="off" placeholder="Search sketchbooks" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      {loading ? <p role="status">Loading…</p> : loadError ? <div role="alert"><p className="text-destructive">Unable to load sketchbooks.</p><Button variant="outline" onClick={load}>Retry</Button></div> : !allowed ? <p className="text-muted-foreground">Sketchbooks belong to the artist archive.</p> : !books.length ? <div className="py-16 text-center"><BookOpen className="h-10 w-10 mx-auto mb-4 text-muted-foreground" /><h2 className="font-serif text-2xl">No sketchbooks yet</h2></div> : <div className="space-y-4">
        {books.filter(b => `${b.title} ${b.year ?? ""} ${b.notes ?? ""}`.toLowerCase().includes(search.toLowerCase())).map(book => <article key={book.id} className="border border-border rounded-sm p-5 flex flex-wrap gap-4 items-start">
          <BookOpen className="h-8 w-8 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0"><h2 className="font-serif text-xl break-words">{book.title}</h2><p className="text-sm text-muted-foreground mt-1">{book.year ? `${book.year} · ` : ""}{book.page_count} pages · {formatBytes(book.file_size)}</p>{book.notes && <p className="text-sm mt-3 whitespace-pre-wrap break-words">{book.notes}</p>}</div>
          <div className="flex gap-1"><Button variant="outline" onClick={() => read(book)}><BookOpen className="h-4 w-4 mr-2" />Read</Button><Button variant="ghost" size="icon" aria-label={`Edit ${book.title}`} title="Edit details" onClick={() => reset(book)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${book.title}`} title="Delete sketchbook" onClick={() => setDeleting(book)}><Trash2 className="h-4 w-4" /></Button></div>
        </article>)}
      </div>}
    </div>
    <Dialog open={open} onOpenChange={value => { if (!saving) { setOpen(value); if (!value) setPhotos([]); } }}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Edit Sketchbook" : "Add Sketchbook"}</DialogTitle><DialogDescription>Private artist archive</DialogDescription></DialogHeader>
      <form autoComplete="off" onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-4">
        <fieldset disabled={saving} className="space-y-4">
          <div><Label htmlFor="sketch-title">Title *</Label><Input autoComplete="off" id="sketch-title" value={title} onChange={e => setTitle(e.target.value)} required /></div>
          <div><Label htmlFor="sketch-year">Year</Label><Input autoComplete="off" id="sketch-year" type="number" value={year} onChange={e => setYear(e.target.value)} /></div>
          <div><Label htmlFor="sketch-notes">Notes</Label><Textarea autoComplete="off" id="sketch-notes" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          {!editing && <><ToggleGroup type="single" value={mode} onValueChange={value => { if (value) setMode(value); }} className="justify-start"><ToggleGroupItem value="pdf" aria-label="Upload PDF"><FileText className="h-4 w-4 mr-2" />PDF</ToggleGroupItem><ToggleGroupItem value="photos" aria-label="Page photos"><Images className="h-4 w-4 mr-2" />Page photos</ToggleGroupItem></ToggleGroup>
          {mode === "pdf" ? <div><Label htmlFor="sketch-pdf">PDF file</Label><Input id="sketch-pdf" type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div> : <><div><Label htmlFor="sketch-photos">Page photos (JPEG, PNG, WebP)</Label><Input id="sketch-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { addPhotos(e.target.files); e.target.value = ""; }} /></div>
          <ol className="space-y-2">{photos.map((photo, index) => <li key={photo.id} className="border border-border p-2 flex gap-3 items-center"><img src={photo.preview} alt={`Page ${index + 1}`} className={`w-16 h-20 object-contain ${photo.rotation === 90 ? "rotate-90" : photo.rotation === 180 ? "rotate-180" : photo.rotation === 270 ? "-rotate-90" : ""}`} /><div className="flex-1 min-w-0"><p className="text-sm">Page {index + 1}</p><p className="text-xs text-muted-foreground truncate">{photo.file.name}</p><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" title="Move page earlier" aria-label={`Move page ${index + 1} earlier`} disabled={index === 0} onClick={() => setPhotos(p => movePage(p, index, -1))}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" title="Move page later" aria-label={`Move page ${index + 1} later`} disabled={index === photos.length - 1} onClick={() => setPhotos(p => movePage(p, index, 1))}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" title="Rotate page" aria-label={`Rotate page ${index + 1}`} onClick={() => setPhotos(p => p.map(item => item.id === photo.id ? { ...item, rotation: (item.rotation + 90) % 360 } : item))}><RotateCw className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" title="Remove page" aria-label={`Remove page ${index + 1}`} onClick={() => setPhotos(p => p.filter(item => item.id !== photo.id))}><X className="h-4 w-4" /></Button></div></div></li>)}</ol></>}
          </>}
        </fieldset>
        {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => { setOpen(false); setPhotos([]); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Sketchbook"}</Button></div>
      </form>
    </DialogContent></Dialog>
    <Dialog open={!!reader} onOpenChange={value => { if (!value) setReader(null); }}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle className="break-words pr-5">{reader?.book.title}</DialogTitle></DialogHeader>{reader && <SketchbookReader key={reader.book.id} url={reader.url} title={reader.book.title} />}</DialogContent></Dialog>
    <Dialog open={!!deleting} onOpenChange={value => { if (!value && !busyDelete) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Delete sketchbook?</DialogTitle><DialogDescription>The PDF and original page photos will be permanently removed.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" disabled={busyDelete} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={busyDelete} onClick={remove}>{busyDelete ? "Deleting…" : "Delete"}</Button></div></DialogContent></Dialog>
  </>;
  return isRegistrarContext ? <RegistrarWorkspaceLayout headerActions={actions}>{content}</RegistrarWorkspaceLayout> : <AppLayout title="Sketchbooks" headerActions={actions}>{content}</AppLayout>;
}