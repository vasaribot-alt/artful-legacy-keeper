import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
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
import { Plus, Pencil, Trash2, ImagePlus, X, FileUp, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [images, setImages] = useState<Record<string, ExhibitionImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  // Image upload
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    loadExhibitions();
  }, []);

  const loadExhibitions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("exhibitions")
      .select("*")
      .eq("user_id", user.id)
      .order("opening_date", { ascending: false });

    if (data) {
      setExhibitions(data as Exhibition[]);
      // Load images for all exhibitions
      const ids = data.map((e: any) => e.id);
      if (ids.length > 0) {
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
      }
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle(""); setExType("solo"); setOpeningDate(""); setClosingDate("");
    setVenue(""); setCity(""); setCountry(""); setCurator("");
    setArtists(""); setDescription(""); setEditingId(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (ex: Exhibition) => {
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
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
      user_id: user.id,
    };

    if (editingId) {
      const { error } = await supabase.from("exhibitions").update(payload).eq("id", editingId);
      if (error) { toast.error("Failed to update"); setSaving(false); return; }
      toast.success("Exhibition updated");
    } else {
      const { error } = await supabase.from("exhibitions").insert(payload);
      if (error) { toast.error("Failed to create"); setSaving(false); return; }
      toast.success("Exhibition added");
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingImages(false); return; }

    const existingCount = (images[exhibitionId] || []).length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${exhibitionId}/${crypto.randomUUID()}.${ext}`;
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

  const formatDateRange = (opening: string | null, closing: string | null) => {
    if (!opening && !closing) return null;
    const parts: string[] = [];
    if (opening) parts.push(format(new Date(opening), "MMMM d, yyyy"));
    if (closing) parts.push(format(new Date(closing), "MMMM d, yyyy"));
    return parts.join(" – ");
  };

  const headerActions = (
    <Button size="sm" onClick={openAdd} className="gap-1.5">
      <Plus className="w-3.5 h-3.5" /> Add Exhibition
    </Button>
  );

  return (
    <AppLayout title="Exhibitions" headerActions={headerActions}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-muted-foreground text-center py-20">Loading...</p>
        ) : exhibitions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No exhibitions yet.</p>
            <p className="text-xs text-muted-foreground mt-2">
              Track your exhibitions, link artworks, and manage show history.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {exhibitions.map((ex) => {
              const exImages = images[ex.id] || [];
              return (
                <div key={ex.id} className="space-y-4">
                  {/* Image grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {exImages.map((img) => (
                      <div key={img.id} className="relative group aspect-[4/3] bg-secondary rounded-sm overflow-hidden">
                        <img src={img.publicUrl} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleDeleteImage(img)}
                          className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {/* Add image button */}
                    <label className="aspect-[4/3] border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-foreground/40 transition-colors">
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add View</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && handleImageUpload(ex.id, e.target.files)}
                      />
                    </label>
                  </div>

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
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Exhibitions;
