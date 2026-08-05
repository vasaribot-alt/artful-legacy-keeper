import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Upload, FileText, Download, Trash2, Link2, Link2Off, Search, FolderOpen, Eye, Copy,
} from "lucide-react";
import { formatBytes } from "@/lib/storageQuota";

interface DocRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string | null;
  share_token: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "governance", label: "Governance & Statutes" },
  { value: "funding", label: "Funding & Grants" },
  { value: "outreach", label: "Outreach & Letters" },
  { value: "alliance", label: "Global Alliance" },
  { value: "presentations", label: "Presentations" },
  { value: "legal", label: "Legal & Finance" },
];

const categoryLabel = (v: string) =>
  CATEGORIES.find((c) => c.value === v)?.label ?? v;

const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

// ── filename similarity helpers ──
const STOP = new Set(["v", "final", "draft", "copy", "new", "rev", "revised", "and", "the", "of"]);

const tokens = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t) && !/^\d{1,2}$/.test(t));

/** 0-1 overlap score between two file names (Jaccard on meaningful tokens). */
const similarity = (a: string, b: string) => {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  ta.forEach((t) => { if (tb.has(t)) shared++; });
  return shared / Math.min(ta.size, tb.size);
};

const SIM_THRESHOLD = 0.6;


const FoundationDocuments = () => {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocRow | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [viewDoc, setViewDoc] = useState<{ doc: DocRow; url: string } | null>(null);
  const [simScanOpen, setSimScanOpen] = useState(false);
  const [simGroups, setSimGroups] = useState<DocRow[][]>([]);


  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      if (!roles?.some((r) => r.role === "foundation")) {
        navigate("/dashboard");
        return;
      }
      setAllowed(true);
      await fetchDocs();
      setLoading(false);
    })();
  }, [navigate]);

  const fetchDocs = async () => {
    const { data, error } = await supabase
      .from("foundation_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Could not load documents"); return; }
    setDocs((data || []) as DocRow[]);
  };

  const handleUpload = async () => {
    if (!file) { toast.error("Choose a file first"); return; }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("foundation-documents")
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("foundation_documents").insert({
        title: title.trim() || file.name,
        description: description.trim() || null,
        category,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || null,
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;

      toast.success("Document uploaded");
      setUploadOpen(false);
      setFile(null); setTitle(""); setDescription(""); setCategory("general");
      fetchDocs();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const bulkUpload = async (files: File[]) => {
    if (!files.length) return;
    setBulkUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      let ok = 0;
      for (const f of files) {
        const safeName = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${user.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("foundation-documents")
          .upload(path, f, { contentType: f.type || undefined });
        if (upErr) { toast.error(`Failed: ${f.name}`); continue; }
        const { error: insErr } = await supabase.from("foundation_documents").insert({
          title: f.name.replace(/\.[^.]+$/, ""),
          category: filterCategory === "all" ? "general" : filterCategory,
          file_path: path,
          file_name: f.name,
          file_size: f.size,
          file_type: f.type || null,
          uploaded_by: user.id,
        });
        if (insErr) { toast.error(`Failed: ${f.name}`); continue; }
        ok++;
      }
      if (ok) toast.success(`${ok} document(s) uploaded`);
      fetchDocs();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBulkUploading(false);
    }
  };

  const changeCategory = async (doc: DocRow, value: string) => {
    const { error } = await supabase
      .from("foundation_documents").update({ category: value }).eq("id", doc.id);
    if (error) { toast.error("Could not change category"); return; }
    setDocs((p) => p.map((d) => (d.id === doc.id ? { ...d, category: value } : d)));
    toast.success("Category updated");
  };

  const handleView = async (doc: DocRow) => {
    const { data, error } = await supabase.storage
      .from("foundation-documents")
      .createSignedUrl(doc.file_path, 3600);
    if (error || !data) { toast.error("Could not open file"); return; }
    setViewDoc({ doc, url: data.signedUrl });
  };

  const handleDownload = async (doc: DocRow) => {
    const { data, error } = await supabase.storage
      .from("foundation-documents")
      .createSignedUrl(doc.file_path, 300);
    if (error || !data) { toast.error("Could not open file"); return; }
    window.open(data.signedUrl, "_blank");
  };


  const deleteDoc = async (doc: DocRow) => {
    await supabase.storage.from("foundation-documents").remove([doc.file_path]);
    const { error } = await supabase.from("foundation_documents").delete().eq("id", doc.id);
    if (error) { toast.error("Could not delete document"); return; }
    toast.success("Document deleted");
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    setSimGroups((groups) =>
      groups
        .map((g) => g.filter((d) => d.id !== doc.id))
        .filter((g) => g.length > 1)
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const doc = deleteTarget;
    setDeleteTarget(null);
    await deleteDoc(doc);
  };

  // Documents whose file name closely matches the file staged for upload
  const similarToStaged = file
    ? docs
        .map((d) => ({ doc: d, score: Math.max(similarity(file.name, d.file_name), similarity(file.name, d.title)) }))
        .filter((r) => r.score >= SIM_THRESHOLD)
        .sort((a, b) => b.score - a.score)
    : [];

  const runSimilarScan = () => {
    const groups: DocRow[][] = [];
    const used = new Set<string>();
    docs.forEach((a, i) => {
      if (used.has(a.id)) return;
      const group = [a];
      docs.slice(i + 1).forEach((b) => {
        if (used.has(b.id)) return;
        const score = Math.max(similarity(a.file_name, b.file_name), similarity(a.title, b.title));
        if (score >= SIM_THRESHOLD) { group.push(b); used.add(b.id); }
      });
      if (group.length > 1) { used.add(a.id); groups.push(group); }
    });
    setSimGroups(groups);
    setSimScanOpen(true);
  };


  const shareUrl = (token: string) => `${window.location.origin}/shared-document/${token}`;

  const toggleShare = async (doc: DocRow) => {
    if (doc.share_token) {
      const { error } = await supabase
        .from("foundation_documents").update({ share_token: null }).eq("id", doc.id);
      if (error) { toast.error("Could not disable link"); return; }
      setDocs((p) => p.map((d) => (d.id === doc.id ? { ...d, share_token: null } : d)));
      toast.success("Share link disabled");
      return;
    }
    const token = randomToken();
    const { error } = await supabase
      .from("foundation_documents").update({ share_token: token }).eq("id", doc.id);
    if (error) { toast.error("Could not create link"); return; }
    setDocs((p) => p.map((d) => (d.id === doc.id ? { ...d, share_token: token } : d)));
    await navigator.clipboard.writeText(shareUrl(token)).catch(() => {});
    toast.success("Share link created and copied");
  };

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(shareUrl(token));
    toast.success("Link copied");
  };

  if (!allowed || loading) return null;

  const visible = docs.filter((d) => {
    const matchesCategory = filterCategory === "all" || d.category === filterCategory;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      [d.title, d.description, d.file_name].some((v) => (v || "").toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const totalSize = docs.reduce((s, d) => s + Number(d.file_size || 0), 0);

  return (
    <AppLayout title="Foundation Documents">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FolderOpen className="h-6 w-6" />
            <h1 className="text-2xl font-semibold">Foundation Documents</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Shared workspace for statutes, letters, pitches and reports. {docs.length} document(s) · {formatBytes(totalSize)}.
            Create a link to share any document with people outside the foundation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              autoComplete="off"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={runSimilarScan}>
            <Copy className="h-4 w-4 mr-1" /> Find similar
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Upload
          </Button>

        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            bulkUpload(Array.from(e.dataTransfer.files || []));
          }}
          className={`border border-dashed rounded-sm p-6 text-center text-sm transition-colors ${
            dragOver ? "border-foreground bg-accent/50" : "border-border text-muted-foreground"
          }`}
        >
          {bulkUploading
            ? "Uploading files…"
            : "Drag and drop files here to upload in bulk" +
              (filterCategory === "all" ? " (filed under General)" : ` (filed under ${categoryLabel(filterCategory)})`)}
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents yet. Upload your first file to start the shared library.
          </p>
        ) : (
          <div className="border border-border rounded-sm divide-y divide-border">
            {visible.map((doc) => (
              <div key={doc.id} className="flex items-start gap-3 p-4">
                <FileText className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleView(doc)}
                      className="font-medium truncate text-left hover:underline"
                    >
                      {doc.title}
                    </button>
                    {doc.share_token && (
                      <Badge variant="secondary" className="text-xs">Shared</Badge>
                    )}
                  </div>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {doc.file_name} · {formatBytes(Number(doc.file_size || 0))} · {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Select value={doc.category} onValueChange={(v) => changeCategory(doc, v)}>
                      <SelectTrigger className="h-7 w-52 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {doc.share_token && (
                      <button
                        onClick={() => copyLink(doc.share_token!)}
                        className="text-xs underline text-muted-foreground hover:text-foreground"
                      >
                        Copy share link
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleView(doc)} title="View in browser">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} title="Open / download">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="sm" onClick={() => toggleShare(doc)}
                    title={doc.share_token ? "Disable share link" : "Create share link"}
                  >
                    {doc.share_token ? <Link2Off className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(doc)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!viewDoc} onOpenChange={(o) => !o && setViewDoc(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle className="truncate">{viewDoc?.doc.title}</DialogTitle></DialogHeader>
          {viewDoc && (() => {
            const src = `${viewDoc.doc.file_name} ${viewDoc.doc.file_path}`.toLowerCase();
            const type = (viewDoc.doc.file_type || "").toLowerCase();
            const ext = (src.match(/\.([a-z0-9]+)(?:\s|$)/g) || []).join(" ");
            const isPdf = type.includes("pdf") || /\.pdf/.test(ext);
            const isImage = type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)/.test(ext);
            const isText = type.startsWith("text/") || /\.(txt|md|csv|json)/.test(ext);
            const isOffice = /\.(docx?|xlsx?|pptx?)/.test(ext) ||
              type.includes("officedocument") || type.includes("msword") || type.includes("ms-excel");

            if (isImage) {
              return (
                <div className="w-full h-[70vh] flex items-center justify-center bg-muted rounded-sm border border-border">
                  <img src={viewDoc.url} alt={viewDoc.doc.title} className="max-h-full max-w-full object-contain" />
                </div>
              );
            }
            if (isPdf || isText) {
              return (
                <iframe
                  src={viewDoc.url}
                  title={viewDoc.doc.title}
                  className="w-full h-[70vh] border border-border rounded-sm bg-muted"
                />
              );
            }
            if (isOffice) {
              return (
                <div className="space-y-2">
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewDoc.url)}`}
                    title={viewDoc.doc.title}
                    className="w-full h-[70vh] border border-border rounded-sm bg-muted"
                  />
                  <div className="flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <a href={viewDoc.url} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4 mr-1" /> Download original
                      </a>
                    </Button>
                  </div>
                </div>
              );
            }
            return (
              <div className="h-[40vh] flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
                <p>This file type cannot be previewed in the browser.</p>
                <Button asChild variant="outline">
                  <a href={viewDoc.url} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-1" /> Open file
                  </a>
                </Button>
              </div>
            );
          })()}

        </DialogContent>
      </Dialog>


      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>File</Label>
              <Input
                type="file"
                className="mt-1.5"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
                }}
              />
            </div>
            {similarToStaged.length > 0 && (
              <div className="rounded-sm border border-border bg-muted p-3 space-y-2">
                <p className="text-xs font-medium">
                  {similarToStaged.length} existing document(s) have a similar file name — is one of them the version you are replacing?
                </p>
                <div className="space-y-1">
                  {similarToStaged.map(({ doc, score }) => (
                    <div key={doc.id} className="flex items-center gap-2 text-xs">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 min-w-0">{doc.file_name}</span>
                      <span className="text-muted-foreground shrink-0">{Math.round(score * 100)}%</span>
                      <span className="text-muted-foreground shrink-0">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => deleteDoc(doc)} title="Delete this older version">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" autoComplete="off" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={3} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !file}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={simScanOpen} onOpenChange={setSimScanOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Similar file names</DialogTitle></DialogHeader>
          {simGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents with closely matching file names.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {simGroups.length} group(s) of documents share most of their file name. Delete the versions you are replacing.
              </p>
              {simGroups.map((group, i) => (
                <div key={i} className="border border-border rounded-sm divide-y divide-border">
                  {group.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 p-2 text-xs">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 min-w-0">{doc.file_name}</span>
                      <span className="text-muted-foreground shrink-0">{formatBytes(Number(doc.file_size || 0))}</span>
                      <span className="text-muted-foreground shrink-0">{new Date(doc.created_at).toLocaleDateString()}</span>
                      <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => deleteDoc(doc)} title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSimScanOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” and its file will be permanently removed. Any share link stops working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default FoundationDocuments;
