import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Catalogue {
  id: string;
  title: string;
  publication_year: number | null;
  publisher: string | null;
  authors: string | null;
  isbn: string | null;
}

const Catalogues = () => {
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [pubYear, setPubYear] = useState("");
  const [publisher, setPublisher] = useState("");
  const [authors, setAuthors] = useState("");
  const [isbn, setIsbn] = useState("");

  useEffect(() => {
    loadCatalogues();
  }, []);

  const loadCatalogues = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("catalogues")
      .select("*")
      .eq("user_id", user.id)
      .order("publication_year", { ascending: false });
    if (data) setCatalogues(data as Catalogue[]);
    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setPubYear("");
    setPublisher("");
    setAuthors("");
    setIsbn("");
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (c: Catalogue) => {
    setEditingId(c.id);
    setTitle(c.title);
    setPubYear(c.publication_year ? String(c.publication_year) : "");
    setPublisher(c.publisher || "");
    setAuthors(c.authors || "");
    setIsbn(c.isbn || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      title: title.trim(),
      publication_year: pubYear ? parseInt(pubYear) : null,
      publisher: publisher.trim() || null,
      authors: authors.trim() || null,
      isbn: isbn.trim() || null,
      user_id: user.id,
    };

    if (editingId) {
      const { error } = await supabase.from("catalogues").update(payload).eq("id", editingId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Catalogue updated");
    } else {
      const { error } = await supabase.from("catalogues").insert(payload);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Catalogue added");
    }

    setDialogOpen(false);
    resetForm();
    loadCatalogues();
  };

  const handleDelete = async (id: string) => {
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

  return (
    <AppLayout title="Catalogues" headerActions={headerActions}>
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
          <div className="space-y-3">
            {catalogues.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-4 p-4 rounded-sm border border-border hover:bg-accent/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium">{c.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-1">
                    {c.publication_year && <span>{c.publication_year}</span>}
                    {c.publisher && <><span>·</span><span>{c.publisher}</span></>}
                    {c.authors && <><span>·</span><span className="truncate max-w-[200px]">{c.authors}</span></>}
                  </div>
                  {c.isbn && (
                    <p className="text-[11px] text-muted-foreground font-mono mt-1">ISBN {c.isbn}</p>
                  )}
                </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Catalogue" : "Add Catalogue"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
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
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingId ? "Update" : "Add"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Catalogues;
