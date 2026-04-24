import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { RegistrarWorkspaceLayout } from "@/components/RegistrarWorkspaceLayout";
import { useActiveOwner } from "@/hooks/use-active-owner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

interface Catalogue {
  id: string;
  title: string;
  publication_year: number | null;
  publisher: string | null;
  authors: string | null;
  isbn: string | null;
  cover_image_path: string | null;
  language: string | null;
  page_count: number | null;
  coverUrl?: string;
}

const Catalogues = () => {
  const { ownerId, isRegistrarContext } = useActiveOwner();
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [pubYear, setPubYear] = useState("");
  const [publisher, setPublisher] = useState("");
  const [authors, setAuthors] = useState("");
  const [isbn, setIsbn] = useState("");
  const [language, setLanguage] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [existingCoverPath, setExistingCoverPath] = useState<string | null>(null);

  useEffect(() => {
    if (ownerId) loadCatalogues();
  }, [ownerId]);

  const loadCatalogues = async () => {
    if (!ownerId) return;
    setLoading(true);
    const { data } = await supabase
      .from("catalogues")
      .select("*")
      .eq("user_id", ownerId)
      .order("publication_year", { ascending: false });
    if (data) {
      const withUrls = (data as Catalogue[]).map((c) => {
        if (c.cover_image_path) {
          const { data: urlData } = supabase.storage.from("catalogue-covers").getPublicUrl(c.cover_image_path);
          return { ...c, coverUrl: urlData.publicUrl };
        }
        return c;
      });
      setCatalogues(withUrls);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle(""); setPubYear(""); setPublisher(""); setAuthors("");
    setIsbn(""); setLanguage(""); setPageCount("");
    setCoverFile(null); setCoverPreview(null); setExistingCoverPath(null);
    setEditingId(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (c: Catalogue) => {
    setEditingId(c.id);
    setTitle(c.title);
    setPubYear(c.publication_year ? String(c.publication_year) : "");
    setPublisher(c.publisher || "");
    setAuthors(c.authors || "");
    setIsbn(c.isbn || "");
    setLanguage(c.language || "");
    setPageCount(c.page_count ? String(c.page_count) : "");
    setCoverFile(null);
    setCoverPreview(c.coverUrl || null);
    setExistingCoverPath(c.cover_image_path || null);
    setDialogOpen(true);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setExistingCoverPath(null);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!ownerId) return;

    setSaving(true);
    let coverPath = existingCoverPath;

    // Upload new cover if selected
    if (coverFile) {
      const ext = coverFile.name.split(".").pop();
      const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("catalogue-covers").upload(path, coverFile);
      if (uploadErr) { toast.error("Failed to upload cover"); setSaving(false); return; }
      // Delete old cover if replacing
      if (existingCoverPath) {
        await supabase.storage.from("catalogue-covers").remove([existingCoverPath]);
      }
      coverPath = path;
    } else if (!coverPreview && existingCoverPath) {
      // Cover was removed
      await supabase.storage.from("catalogue-covers").remove([existingCoverPath]);
      coverPath = null;
    }

    const payload = {
      title: title.trim(),
      publication_year: pubYear ? parseInt(pubYear) : null,
      publisher: publisher.trim() || null,
      authors: authors.trim() || null,
      isbn: isbn.trim() || null,
      language: language.trim() || null,
      page_count: pageCount ? parseInt(pageCount) : null,
      cover_image_path: coverPath,
      user_id: ownerId,
    };

    if (editingId) {
      const { error } = await supabase.from("catalogues").update(payload).eq("id", editingId);
      if (error) { toast.error("Failed to update"); setSaving(false); return; }
      toast.success("Catalogue updated");
    } else {
      const { error } = await supabase.from("catalogues").insert(payload);
      if (error) { toast.error("Failed to create"); setSaving(false); return; }
      toast.success("Catalogue added");
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    loadCatalogues();
  };

  const handleDelete = async (id: string) => {
    const cat = catalogues.find((c) => c.id === id);
    if (cat?.cover_image_path) {
      await supabase.storage.from("catalogue-covers").remove([cat.cover_image_path]);
    }
    const { error } = await supabase.from("catalogues").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Catalogue deleted");
    loadCatalogues();
  };

  const headerActions = (
    <Button size="sm" onClick={openAdd} className="gap-1.5">
      <Plus className="w-3.5 h-3.5" /> Add Catalogue
    </Button>
  );

  const Layout = isRegistrarContext ? RegistrarWorkspaceLayout : AppLayout;
  const layoutProps = isRegistrarContext
    ? { headerActions }
    : { title: "Catalogues", headerActions };

  return (
    <Layout {...(layoutProps as any)}>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-muted-foreground text-center py-20">Loading...</p>
        ) : catalogues.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No catalogues yet.</p>
            <p className="text-xs text-muted-foreground mt-2">
              Add exhibition catalogues and publications where your artworks have been documented.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {catalogues.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-5 p-5 rounded-sm border border-border hover:bg-accent/30 transition-colors"
              >
                {/* Cover image */}
                {c.coverUrl ? (
                  <img
                    src={c.coverUrl}
                    alt={c.title}
                    className="w-24 h-32 object-cover rounded-sm shrink-0 bg-secondary"
                  />
                ) : (
                  <div className="w-24 h-32 bg-secondary rounded-sm shrink-0 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">No cover</span>
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{c.title}</h3>
                  {c.authors && (
                    <p className="text-sm text-muted-foreground mt-0.5">by {c.authors}</p>
                  )}
                  <div className="mt-2 space-y-0.5 text-sm">
                    {c.publisher && (
                      <p><span className="text-muted-foreground">Publisher :</span> {c.publisher}</p>
                    )}
                    {c.publication_year && (
                      <p><span className="text-muted-foreground">Publication year :</span> {c.publication_year}</p>
                    )}
                    {c.language && (
                      <p><span className="text-muted-foreground">Language :</span> {c.language}</p>
                    )}
                    {c.page_count && (
                      <p><span className="text-muted-foreground">Print length :</span> {c.page_count} pages</p>
                    )}
                    {c.isbn && (
                      <p><span className="text-muted-foreground">ISBN :</span> <span className="font-mono">{c.isbn}</span></p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Catalogue" : "Add Catalogue"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Cover upload */}
            <div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
              {coverPreview ? (
                <div className="relative w-20 h-28 group">
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover rounded-sm border border-border" />
                  <button
                    type="button"
                    onClick={removeCover}
                    className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="w-20 h-28 border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-1 hover:border-foreground/40 transition-colors"
                >
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Add</span>
                </button>
              )}
            </div>

            <div>
              <Label htmlFor="cat-title">Catalogue Title *</Label>
              <Input id="cat-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cat-year">Publication Year</Label>
                <Input id="cat-year" type="number" value={pubYear} onChange={(e) => setPubYear(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="cat-isbn">ISBN</Label>
                <Input id="cat-isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label htmlFor="cat-publisher">Publisher</Label>
              <Input id="cat-publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="cat-authors">Authors</Label>
              <Input id="cat-authors" value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="e.g. John Smith, Jane Doe" className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cat-lang">Language</Label>
                <Input id="cat-lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="cat-pages">Print Length (pages)</Label>
                <Input id="cat-pages" type="number" value={pageCount} onChange={(e) => setPageCount(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Catalogues;
