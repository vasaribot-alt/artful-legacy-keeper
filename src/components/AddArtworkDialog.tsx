import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, ImagePlus, X, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExhibitionPicker } from "@/components/ExhibitionPicker";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export interface ArtworkDuplicateData {
  title?: string;
  artistName?: string;
  artworkType?: string;
  medium?: string;
  year?: string;
  description?: string;
  isUnique?: boolean;
  series?: string;
  subCategory?: string;
  support?: string;
  signed?: string;
  height?: string;
  width?: string;
  depth?: string;
  weight?: string;
  price?: string;
  currency?: string;
  artworkLocation?: string;
  editionCount?: string;
  artistProofs?: string;
  editionNumber?: string;
  exhibitionHistory?: string;
  provenance?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userRole?: string;
  initialData?: ArtworkDuplicateData | null;
}

const currencies = ["EUR", "USD", "GBP", "SEK", "NOK", "DKK", "CHF"];
const artworkTypes = ["Painting", "Drawing", "Collage", "Print", "Photography", "Sculpture"];
const sculptureSubCategories = ["Modelled", "Casted", "Carved", "Assembled", "3D printed"];

interface ImagePreview {
  file: File;
  preview: string;
}

export const AddArtworkDialog = ({ open, onOpenChange, onSuccess, userRole = "artist", initialData }: Props) => {
  const isCollector = userRole === "collector";
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [exhibitionHistory, setExhibitionHistory] = useState("");
  const [selectedExhibitionIds, setSelectedExhibitionIds] = useState<string[]>([]);
  const [provenance, setProvenance] = useState("");
  const [artworkType, setArtworkType] = useState("");
  const [medium, setMedium] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [isUnique, setIsUnique] = useState(true);
  const [series, setSeries] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [support, setSupport] = useState("");
  const [signed, setSigned] = useState("");
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [artworkLocation, setArtworkLocation] = useState("");
  const [editionCount, setEditionCount] = useState("");
  const [artistProofs, setArtistProofs] = useState("");
  const [editionNumber, setEditionNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("available");
  const [buyerName, setBuyerName] = useState("");
  const [soldDate, setSoldDate] = useState<Date | undefined>(undefined);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Series dropdown state
  const [seriesOptions, setSeriesOptions] = useState<string[]>([]);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [newSeriesInput, setNewSeriesInput] = useState("");

  useEffect(() => {
    if (open) {
      fetchSeriesOptions();
      if (initialData) {
        setTitle(initialData.title || "");
        setArtistName(initialData.artistName || "");
        setArtworkType(initialData.artworkType || "");
        setMedium(initialData.medium || "");
        setYear(initialData.year || "");
        setDescription(initialData.description || "");
        setIsUnique(initialData.isUnique ?? true);
        setSeries(initialData.series || "");
        setSubCategory(initialData.subCategory || "");
        setSupport(initialData.support || "");
        setSigned(initialData.signed || "");
        setHeight(initialData.height || "");
        setWidth(initialData.width || "");
        setDepth(initialData.depth || "");
        setWeight(initialData.weight || "");
        setPrice(initialData.price || "");
        setCurrency(initialData.currency || "EUR");
        setArtworkLocation(initialData.artworkLocation || "");
        setEditionCount(initialData.editionCount || "");
        setArtistProofs(initialData.artistProofs || "");
        setEditionNumber(initialData.editionNumber || "");
        setExhibitionHistory(initialData.exhibitionHistory || "");
        setProvenance(initialData.provenance || "");
      }
    }
  }, [open, initialData]);

  useEffect(() => {
    // Cleanup previews on unmount
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  const fetchSeriesOptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("series_groups")
      .select("name")
      .eq("user_id", user.id)
      .order("name");
    if (data) setSeriesOptions(data.map((d) => d.name));
  };

  const addNewSeries = async () => {
    const name = newSeriesInput.trim();
    if (!name) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("series_groups").insert({ user_id: user.id, name });
    if (error) {
      if (error.code === "23505") toast.error("Series already exists");
      else toast.error("Failed to add series");
      return;
    }
    setSeriesOptions((prev) => [...prev, name].sort());
    setSeries(name);
    setNewSeriesInput("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const resetForm = () => {
    setTitle(""); setArtistName(""); setExhibitionHistory(""); setProvenance(""); setArtworkType(""); setMedium(""); setYear(""); setDescription("");
    setIsUnique(true); setSeries(""); setSubCategory(""); setSupport(""); setSelectedExhibitionIds([]);
    setSigned(""); setHeight(""); setWidth(""); setDepth(""); setStatus("available"); setBuyerName(""); setSoldDate(undefined);
    setWeight(""); setPrice(""); setCurrency("EUR"); setArtworkLocation("");
    setEditionCount(""); setArtistProofs(""); setEditionNumber("");
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  const uploadImages = async (userId: string, artworkId: string): Promise<boolean> => {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const ext = img.file.name.split(".").pop() || "jpg";
      const path = `${userId}/${artworkId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("artwork-images")
        .upload(path, img.file);

      if (uploadError) {
        toast.error(`Failed to upload image ${i + 1}`);
        return false;
      }

      const { error: dbError } = await supabase.from("artwork_images").insert({
        artwork_id: artworkId,
        storage_path: path,
        display_order: i,
      });

      if (dbError) {
        toast.error(`Failed to save image record ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }

    const activeRole = localStorage.getItem("activeRole") || "artist";
    const insertData: Record<string, unknown> = {
      owner_id: user.id,
      title: title.trim(),
      artwork_type: artworkType || null,
      medium: medium.trim() || null,
      year: year ? parseInt(year) : null,
      description: description.trim() || null,
      is_unique: isUnique,
      series: series.trim() || null,
      sub_category: subCategory || null,
      support: support.trim() || null,
      signed: signed.trim() || null,
      height: height ? parseFloat(height) : null,
      width: width ? parseFloat(width) : null,
      depth: depth ? parseFloat(depth) : null,
      weight: weight ? parseFloat(weight) : null,
      price: price ? parseFloat(price) : null,
      currency: currency,
      artwork_location: artworkLocation.trim() || null,
      edition_count: !isUnique && editionCount ? parseInt(editionCount) : null,
      artist_proofs: !isUnique && artistProofs ? parseInt(artistProofs) : null,
      exhibition_history: exhibitionHistory.trim() || null,
      provenance: provenance.trim() || null,
      artist_name: artistName.trim() || null,
      edition_number: editionNumber.trim() || null,
      role_context: activeRole,
      status,
      buyer_name: status === "sold" ? (buyerName.trim() || null) : null,
      sold_date: status === "sold" && soldDate ? format(soldDate, "yyyy-MM-dd") : null,
    };

    const { data: artworkData, error } = await supabase.from("artworks").insert(insertData as any).select("id").single();

    if (error || !artworkData) {
      toast.error("Failed to add artwork");
      setLoading(false);
      return;
    }

    // Upload images
    if (images.length > 0) {
      const ok = await uploadImages(user.id, artworkData.id);
      if (!ok) {
        setLoading(false);
        return;
      }
    }

    // Link exhibition entries
    if (selectedExhibitionIds.length > 0) {
      await supabase.from("artwork_exhibitions").insert(
        selectedExhibitionIds.map((cv_entry_id) => ({ artwork_id: artworkData.id, cv_entry_id }))
      );
    }

    // Save new series
    if (series.trim() && !seriesOptions.includes(series.trim())) {
      await supabase.from("series_groups").insert({ user_id: user.id, name: series.trim() }).select();
      fetchSeriesOptions();
    }

    setLoading(false);
    toast.success("Artwork added");
    resetForm();
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Duplicate Artwork" : "Add Artwork"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Images */}
          <div>
            <Label className="mb-1.5 block">Photos</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-sm overflow-hidden border border-border">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-sm border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-foreground/40 transition-colors"
              >
                <ImagePlus className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Add</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <Separator />

          {/* Core info */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1.5" />
          </div>

          {isCollector && (
            <div>
              <Label htmlFor="artistName">Artist name</Label>
              <Input id="artistName" value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="e.g. Henry Moore" className="mt-1.5" />
            </div>
          )}

          <div>
            <Label>Type of artwork</Label>
            <Select value={artworkType} onValueChange={(v) => { setArtworkType(v); if (v !== "Sculpture") setSubCategory(""); }}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {artworkTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {artworkType === "Sculpture" && (
            <div>
              <Label>Sculpture sub-category</Label>
              <Select value={subCategory} onValueChange={setSubCategory}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select sub-category" />
                </SelectTrigger>
                <SelectContent>
                  {sculptureSubCategories.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="year">Date of creation</Label>
              <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2024" className="mt-1.5" />
            </div>
            <div>
              <Label>Series / Group</Label>
              <Popover open={seriesOpen} onOpenChange={setSeriesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={seriesOpen}
                    className="w-full justify-between mt-1.5 font-normal"
                  >
                    {series || "Select or add..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-2" align="start">
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {seriesOptions.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-1">No series yet</p>
                    )}
                    {seriesOptions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-accent",
                          series === s && "bg-accent"
                        )}
                        onClick={() => { setSeries(s); setSeriesOpen(false); }}
                      >
                        <Check className={cn("h-3 w-3", series === s ? "opacity-100" : "opacity-0")} />
                        {s}
                      </button>
                    ))}
                  </div>
                  <Separator className="my-2" />
                  <div className="flex gap-1">
                    <Input
                      value={newSeriesInput}
                      onChange={(e) => setNewSeriesInput(e.target.value)}
                      placeholder="New series name"
                      className="h-8 text-sm"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewSeries(); } }}
                    />
                    <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={addNewSeries}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Unique work</Label>
              <p className="text-xs text-muted-foreground">Toggle off for editions</p>
            </div>
            <Switch checked={isUnique} onCheckedChange={(v) => { setIsUnique(v); if (v) { setEditionCount(""); setArtistProofs(""); setEditionNumber(""); } }} />
          </div>

          {!isUnique && isCollector && (
            <div>
              <Label htmlFor="editionNumber">Edition number</Label>
              <Input id="editionNumber" value={editionNumber} onChange={(e) => setEditionNumber(e.target.value)} placeholder="e.g. 3/8" className="mt-1.5" />
            </div>
          )}

          {!isUnique && !isCollector && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="editionCount">Number of editions</Label>
                <Input id="editionCount" type="number" min="1" value={editionCount} onChange={(e) => setEditionCount(e.target.value)} placeholder="e.g. 8" className="mt-1.5" />
              </div>
              <div>
                <Label>Artist Proofs (AP)</Label>
                <Select value={artistProofs} onValueChange={setArtistProofs}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} AP</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Separator />

          {/* Materials */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="medium">Medium</Label>
              <Input id="medium" value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="e.g. Oil on canvas" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="support">Support</Label>
              <Input id="support" value={support} onChange={(e) => setSupport(e.target.value)} placeholder="e.g. Linen" className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="signed">Signed</Label>
              <Input id="signed" value={signed} onChange={(e) => setSigned(e.target.value)} placeholder="e.g. Signed verso" className="mt-1.5" />
            </div>
          </div>

          <Separator />

          {/* Dimensions */}
          <div>
            <Label className="mb-1.5 block">Dimensions (cm)</Label>
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Height" />
              <Input type="number" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="Width" />
              <Input type="number" step="0.1" value={depth} onChange={(e) => setDepth(e.target.value)} placeholder="Depth" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={artworkLocation} onChange={(e) => setArtworkLocation(e.target.value)} placeholder="e.g. Studio, Storage" className="mt-1.5" />
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Status</Label>
              <p className="text-xs text-muted-foreground">Available or sold</p>
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "sold" && (
            <div>
              <Label htmlFor="buyerName">Buyer</Label>
              <Input
                id="buyerName"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Buyer name (leave empty for Unknown buyer)"
                className="mt-1.5"
              />
              {!buyerName.trim() && (
                <p className="text-xs text-muted-foreground mt-1">Will display as "Unknown buyer"</p>
              )}
            </div>
          )}

          <Separator />

          {/* Price */}
          <div>
            <Label className="mb-1.5 block">Price</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Amount" />
              </div>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5" />
          </div>

          <ExhibitionPicker
            selectedIds={selectedExhibitionIds}
            onSelectionChange={setSelectedExhibitionIds}
          />

          <div>
            <Label htmlFor="provenance">Provenance</Label>
            <Textarea id="provenance" value={provenance} onChange={(e) => setProvenance(e.target.value)} placeholder="Ownership history…" rows={3} className="mt-1.5" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Artwork"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
