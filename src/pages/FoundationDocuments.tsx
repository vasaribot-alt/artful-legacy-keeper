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
  Upload, FileText, Download, Trash2, Link2, Link2Off, Search, FolderOpen, Eye,
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

  const handleDownload = async (doc: DocRow) => {
    const { data, error } = await supabase.storage
      .from("foundation-documents")
      .createSignedUrl(doc.file_path, 300);
    if (error || !data) { toast.error("Could not open file"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const doc = deleteTarget;
    setDeleteTarget(null);
    await supabase.storage.from("foundation-documents").remove([doc.file_path]);
    const { error } = await supabase.from("foundation_documents").delete().eq("id", doc.id);
    if (error) { toast.error("Could not delete document"); return; }
    toast.success("Document deleted");
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
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
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Upload
          </Button>
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
                    <span className="font-medium truncate">{doc.title}</span>
                    <Badge variant="outline" className="text-xs">{categoryLabel(doc.category)}</Badge>
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
                  {doc.share_token && (
                    <button
                      onClick={() => copyLink(doc.share_token!)}
                      className="text-xs underline mt-1 text-muted-foreground hover:text-foreground"
                    >
                      Copy share link
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
