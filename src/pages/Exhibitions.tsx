import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { RegistrarWorkspaceLayout } from "@/components/RegistrarWorkspaceLayout";
import { useActiveOwner } from "@/hooks/use-active-owner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, FileUp, EyeOff, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ImportCvExhibitionsDialog } from "@/components/ImportCvExhibitionsDialog";
import { ExhibitionArtworkPicker } from "@/components/ExhibitionArtworkPicker";
import { SortableExhibitionImageGrid } from "@/components/SortableExhibitionImageGrid";
import { ExhibitionDocuments } from "@/components/ExhibitionDocuments";

interface Exhibition {
  id: string;
  title: string;
  exhibition_type: string;
  opening_date: string | null;
  closing_date: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  curator: string | null;
  artists: string | null;
  description: string | null;
  hide_from_cv: boolean;
}

interface ExhibitionImage {
  id: string;
  storage_path: string;
  display_order: number;
  caption: string | null;
  publicUrl: string;
}

const Exhibitions = () => {
  const { ownerId, isRegistrarContext, loading: ownerLoading } = useActiveOwner();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [images, setImages] = useState<Record<string, ExhibitionImage[]>>({});
  const [typeFilter, setTypeFilter] = useState<"all" | "solo" | "group">("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  // Form state
  const [title, setTitle] = useState("");
  const [exType, setExType] = useState("solo");
  const [openingDate, setOpeningDate] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [curator, setCurator] = useState("");
  const [artists, setArtists] = useState("");
  const [description, setDescription] = useState("");
  const [exhibitionText, setExhibitionText] = useState("");
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<string[]>([]);
  const [exhibitionArtworks, setExhibitionArtworks] = useState<Record<string, { id: string; title: string; year: number | null }[]>>({});

  // Lightbox
  const [lightbox, setLightbox] = useState<{ images: ExhibitionImage[]; index: number } | null>(null);

  // Image upload
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (ownerId) loadExhibitions();
  }, [ownerId]);

  const loadExhibitions = async () => {
    if (!ownerId) return;
    setLoading(true);

    const { data } = await supabase
      .from("exhibitions")
      .select("*")
      .eq("user_id", ownerId)
      .order("opening_date", { ascending: false });

    if (data) {
      setExhibitions(data as Exhibition[]);
      const ids = data.map((e: any) => e.id);
      if (ids.length > 0) {
        // Load images
        const { data: imgs } = await supabase
          .from("exhibition_images")
          .select("*")
          .in("exhibition_id", ids)
          .order("display_order");
        if (imgs) {
          const grouped: Record<string, ExhibitionImage[]> = {};
          imgs.forEach((img: any) => {
            const { data: urlData } = supabase.storage.from("exhibition-images").getPublicUrl(img.storage_path);
            const withUrl = { ...img, publicUrl: urlData.publicUrl };
            if (!grouped[img.exhibition_id]) grouped[img.exhibition_id] = [];
            grouped[img.exhibition_id].push(withUrl);
          });
          setImages(grouped);
        }
        // Load linked artworks
        const { data: links } = await supabase
          .from("exhibition_artworks")
          .select("exhibition_id, artwork_id, artworks(id, title, year)")
          .in("exhibition_id", ids);
        if (links) {
          const grouped: Record<string, { id: string; title: string; year: number | null }[]> = {};
          links.forEach((link: any) => {
            if (!grouped[link.exhibition_id]) grouped[link.exhibition_id] = [];
            if (link.artworks) grouped[link.exhibition_id].push(link.artworks);
          });
          setExhibitionArtworks(grouped);
        }
      }
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle(""); setExType("solo"); setOpeningDate(""); setClosingDate("");
    setVenue(""); setCity(""); setCountry(""); setCurator("");
    setArtists(""); setDescription(""); setExhibitionText(""); setEditingId(null);
    setSelectedArtworkIds([]);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = async (ex: Exhibition) => {
    setEditingId(ex.id);
    setTitle(ex.title);
    setExType(ex.exhibition_type);
    setOpeningDate(ex.opening_date || "");
    setClosingDate(ex.closing_date || "");
    setVenue(ex.venue || "");
    setCity(ex.city || "");
    setCountry(ex.country || "");
    setCurator(ex.curator || "");
    setArtists(ex.artists || "");
    setDescription(ex.description || "");
    setExhibitionText((ex as any).exhibition_text || "");
    // Load linked artwork ids
    const linked = (exhibitionArtworks[ex.id] || []).map((a) => a.id);
    setSelectedArtworkIds(linked);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!ownerId) return;

    setSaving(true);
    const payload = {
      title: title.trim(),
      exhibition_type: exType,
      opening_date: openingDate || null,
      closing_date: closingDate || null,
      venue: venue.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      curator: curator.trim() || null,
      artists: artists.trim() || null,
      description: description.trim() || null,
      exhibition_text: exhibitionText.trim() || null,
      user_id: ownerId,
    };

    let exhibitionId = editingId;

    if (editingId) {
      const { error } = await supabase.from("exhibitions").update(payload).eq("id", editingId);
      if (error) { toast.error("Failed to update"); setSaving(false); return; }
      toast.success("Exhibition updated");
    } else {
      const { data: inserted, error } = await supabase.from("exhibitions").insert(payload).select("id").single();
      if (error || !inserted) { toast.error("Failed to create"); setSaving(false); return; }
      exhibitionId = inserted.id;
      toast.success("Exhibition added");
    }

    // Sync artwork links
    if (exhibitionId) {
      await supabase.from("exhibition_artworks").delete().eq("exhibition_id", exhibitionId);
      if (selectedArtworkIds.length > 0) {
        await supabase.from("exhibition_artworks").insert(
          selectedArtworkIds.map((artworkId) => ({
            exhibition_id: exhibitionId!,
            artwork_id: artworkId,
          }))
        );
      }
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    loadExhibitions();
  };

  const handleDelete = async (id: string) => {
    // Delete associated images from storage
    const exImages = images[id] || [];
    if (exImages.length > 0) {
      await supabase.storage.from("exhibition-images").remove(exImages.map((i) => i.storage_path));
    }
    const { error } = await supabase.from("exhibitions").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Exhibition deleted");
    loadExhibitions();
  };

  const handleImageUpload = async (exhibitionId: string, files: FileList) => {
    setUploadingImages(true);
    if (!ownerId) { setUploadingImages(false); return; }

    const existingCount = (images[exhibitionId] || []).length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `${ownerId}/${exhibitionId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("exhibition-images").upload(path, file);
      if (uploadErr) { toast.error(`Failed to upload ${file.name}`); continue; }
      await supabase.from("exhibition_images").insert({
        exhibition_id: exhibitionId,
        storage_path: path,
        display_order: existingCount + i,
      });
    }

    setUploadingImages(false);
    toast.success("Images uploaded");
    loadExhibitions();
  };

  const handleDeleteImage = async (img: ExhibitionImage) => {
    await supabase.storage.from("exhibition-images").remove([img.storage_path]);
    await supabase.from("exhibition_images").delete().eq("id", img.id);
    toast.success("Image removed");
    loadExhibitions();
  };

  const handleUpdateCaption = async (imageId: string, caption: string) => {
    const trimmed = caption.trim() || null;
    await supabase.from("exhibition_images").update({ caption: trimmed }).eq("id", imageId);
  };

  const handleReorder = async (exhibitionId: string, reorderedImages: ExhibitionImage[]) => {
    // Update local state immediately
    setImages((prev) => ({ ...prev, [exhibitionId]: reorderedImages }));
    // Persist new order
    for (let i = 0; i < reorderedImages.length; i++) {
      await supabase.from("exhibition_images").update({ display_order: i }).eq("id", reorderedImages[i].id);
    }
  };

  const toggleCvVisibility = async (ex: Exhibition) => {
    const { error } = await supabase
      .from("exhibitions")
      .update({ hide_from_cv: !ex.hide_from_cv })
      .eq("id", ex.id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(ex.hide_from_cv ? "Now visible in CV" : "Hidden from CV");
    loadExhibitions();
  };

  const formatDateRange = (opening: string | null, closing: string | null) => {
    if (!opening && !closing) return null;
    const parts: string[] = [];
    if (opening) parts.push(format(new Date(opening), "MMMM d, yyyy"));
    if (closing) parts.push(format(new Date(closing), "MMMM d, yyyy"));
    return parts.join(" – ");
  };

  const headerActions = (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-1.5">
        <FileUp className="w-3.5 h-3.5" /> Import from CV
      </Button>
      <Button size="sm" onClick={openAdd} className="gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Add Exhibition
      </Button>
    </div>
  );

  const filteredExhibitions = typeFilter === "all"
    ? exhibitions
    : exhibitions.filter((ex) => ex.exhibition_type === typeFilter);

  const Layout = isRegistrarContext ? RegistrarWorkspaceLayout : AppLayout;
  const layoutProps = isRegistrarContext
    ? { headerActions }
    : { title: "Exhibitions", headerActions };

  return (
    <Layout {...(layoutProps as any)}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex justify-center mb-8">
          <div className="flex border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setTypeFilter("solo")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === "solo"
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              Solo exhibitions
            </button>
            <button
              onClick={() => setTypeFilter("group")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors border-l border-border ${
                typeFilter === "group"
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              Group exhibitions
            </button>
          </div>
        </div>
        {loading ? (
          <p className="text-muted-foreground text-center py-20">Loading...</p>
        ) : filteredExhibitions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              {exhibitions.length === 0
                ? "No exhibitions yet."
                : `No ${typeFilter} exhibitions found.`}
            </p>
            {exhibitions.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Track your exhibitions, link artworks, and manage show history.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {filteredExhibitions.map((ex) => {
              const exImages = images[ex.id] || [];
              return (
                <div key={ex.id} className="space-y-4">
                  {/* Image grid */}
                  <SortableExhibitionImageGrid
                    exhibitionId={ex.id}
                    images={exImages}
                    onReorder={handleReorder}
                    onDeleteImage={handleDeleteImage}
                    onCaptionChange={handleUpdateCaption}
                    onClickImage={(index) => setLightbox({ images: exImages, index })}
                    onUpload={handleImageUpload}
                  />

                  {/* Exhibition info */}
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0 text-center">
                      <h3 className="text-sm font-medium">
                        {ex.title}
                      </h3>
                      {(ex.venue || ex.city) && (
                        <p className="text-sm text-muted-foreground">
                          {[ex.venue, ex.city].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {(ex.opening_date || ex.closing_date) && (
                        <p className="text-sm text-muted-foreground">
                          {formatDateRange(ex.opening_date, ex.closing_date)}
                        </p>
                      )}
                      {(exhibitionArtworks[ex.id] || []).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {(exhibitionArtworks[ex.id] || []).map((a) => `${a.title}${a.year ? ` (${a.year})` : ""}`).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={ex.hide_from_cv ? "Hidden from CV" : "Visible in CV"}
                        onClick={() => toggleCvVisibility(ex)}
                      >
                        {ex.hide_from_cv ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ex)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(ex.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Documents</p>
                    <ExhibitionDocuments exhibitionId={ex.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Exhibition" : "Add Exhibition"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="ex-title">Exhibition Title *</Label>
              <Input id="ex-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ex-type">Exhibition Type</Label>
              <Select value={exType} onValueChange={setExType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Solo Exhibition</SelectItem>
                  <SelectItem value="group">Group Exhibition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ex-open">Opening Date</Label>
                <Input id="ex-open" type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="ex-close">Closing Date</Label>
                <Input id="ex-close" type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label htmlFor="ex-venue">Venue / Gallery</Label>
              <Input id="ex-venue" value={venue} onChange={(e) => setVenue(e.target.value)} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ex-city">City</Label>
                <Input id="ex-city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="ex-country">Country</Label>
                <Input id="ex-country" value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label htmlFor="ex-curator">Curator</Label>
              <Input id="ex-curator" value={curator} onChange={(e) => setCurator(e.target.value)} className="mt-1.5" />
            </div>
            {exType === "group" && (
              <div>
                <Label htmlFor="ex-artists">Artists</Label>
                <Input id="ex-artists" value={artists} onChange={(e) => setArtists(e.target.value)} placeholder="e.g. Artist A, Artist B" className="mt-1.5" />
              </div>
            )}
            <div>
              <Label htmlFor="ex-text">Exhibition Text</Label>
              <Textarea
                id="ex-text"
                value={exhibitionText}
                onChange={(e) => setExhibitionText(e.target.value)}
                placeholder="Press release, curator statement, or catalogue text..."
                className="mt-1.5 min-h-[120px]"
              />
            </div>
            <ExhibitionArtworkPicker
              selectedIds={selectedArtworkIds}
              onSelectionChange={setSelectedArtworkIds}
            />
            {editingId ? (
              <div className="space-y-2">
                <Label>Documents</Label>
                <ExhibitionDocuments exhibitionId={editingId} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Save exhibition first to add documents.</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ImportCvExhibitionsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImported={loadExhibitions}
      />

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setLightbox((prev) => prev && ({ ...prev, index: Math.max(0, prev.index - 1) }));
            if (e.key === "ArrowRight") setLightbox((prev) => prev && ({ ...prev, index: Math.min(prev.images.length - 1, prev.index + 1) }));
            if (e.key === "Escape") setLightbox(null);
          }}
          tabIndex={0}
          ref={(el) => el?.focus()}
        >
          <img
            src={lightbox.images[lightbox.index].publicUrl}
            alt=""
            className="max-h-[85vh] max-w-[85vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {lightbox.index > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/20 hover:bg-background/40 backdrop-blur-sm rounded-full p-2 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightbox((prev) => prev && ({ ...prev, index: prev.index - 1 })); }}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          {lightbox.index < lightbox.images.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/20 hover:bg-background/40 backdrop-blur-sm rounded-full p-2 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightbox((prev) => prev && ({ ...prev, index: prev.index + 1 })); }}
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          <button
            className="absolute top-4 right-4 bg-background/20 hover:bg-background/40 backdrop-blur-sm rounded-full p-2 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
            {lightbox.images[lightbox.index].caption && (
              <p className="text-white/90 text-sm mb-1">{lightbox.images[lightbox.index].caption}</p>
            )}
            <span className="text-white/50 text-xs">
              {lightbox.index + 1} / {lightbox.images.length}
            </span>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Exhibitions;
