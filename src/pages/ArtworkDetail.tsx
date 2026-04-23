import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ExhibitionPicker } from "@/components/ExhibitionPicker";
import { CataloguePicker } from "@/components/CataloguePicker";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, X, FileUp, FileText, Trash2, Eye, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LocationHistoryManager } from "@/components/LocationHistoryManager";
import { PhotographySizesManager } from "@/components/PhotographySizesManager";
import { SaleDatePicker } from "@/components/SaleDatePicker";
import { VerificationBadge } from "@/components/VerificationBadge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const currencies = ["EUR", "USD", "GBP", "SEK", "NOK", "DKK", "CHF"];
const artworkStatuses = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
];
const artworkTypes = ["Painting", "Drawing", "Collage", "Print", "Photography", "Sculpture"];
const sculptureSubCategories = ["Modelled", "Casted", "Carved", "Assembled", "3D printed"];

const acceptedDocTypes = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.csv";

interface ArtworkImage {
  id: string;
  storage_path: string;
  display_order: number;
  publicUrl: string;
}

interface ArtworkDocument {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  created_at: string;
}

const ArtworkDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const originalValuesRef = useRef<Record<string, any>>({});
  const [siblingIds, setSiblingIds] = useState<{ prev: string | null; next: string | null }>({ prev: null, next: null });

  // Form fields
  const [title, setTitle] = useState("");
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
  const [exhibitionHistory, setExhibitionHistory] = useState("");
  const [provenance, setProvenance] = useState("");
  const [artistName, setArtistName] = useState("");
  const [editionNumber, setEditionNumber] = useState("");
  const [status, setStatus] = useState("available");
  const [buyerName, setBuyerName] = useState("");
  const [soldDate, setSoldDate] = useState<Date | undefined>(undefined);
  const [selectedExhibitionIds, setSelectedExhibitionIds] = useState<string[]>([]);
  const [globalArtworkId, setGlobalArtworkId] = useState<number>(0);
  const [selectedCatalogueIds, setSelectedCatalogueIds] = useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<string>("pending");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [verifyingNow, setVerifyingNow] = useState(false);

  // Images
  const [existingImages, setExistingImages] = useState<ArtworkImage[]>([]);
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Documents
  const [documents, setDocuments] = useState<ArtworkDocument[]>([]);
  const [newDocuments, setNewDocuments] = useState<File[]>([]);
  const [deletedDocIds, setDeletedDocIds] = useState<string[]>([]);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Load sibling artwork IDs for prev/next navigation
  useEffect(() => {
    if (!id) return;
    const loadSiblings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const activeRole = localStorage.getItem("activeRole") || "artist";
      const { data } = await supabase
        .from("artworks")
        .select("id")
        .eq("owner_id", user.id)
        .eq("role_context", activeRole)
        .order("created_at", { ascending: false });
      if (!data) return;
      const idx = data.findIndex((a) => a.id === id);
      setSiblingIds({
        prev: idx > 0 ? data[idx - 1].id : null,
        next: idx < data.length - 1 ? data[idx + 1].id : null,
      });
    };
    loadSiblings();
  }, [id]);

  // Keyboard shortcuts for prev/next navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === "ArrowLeft" && siblingIds.prev) {
        navigate(`/artwork/${siblingIds.prev}`);
      } else if (e.key === "ArrowRight" && siblingIds.next) {
        navigate(`/artwork/${siblingIds.next}`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [siblingIds, navigate]);

  useEffect(() => {
    if (!id) return;
    loadArtwork();
    return () => {
      newImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [id]);

  // Track unsaved changes
  useEffect(() => {
    if (loading) return;
    const o = originalValuesRef.current;
    const changed =
      title !== o.title || artworkType !== o.artworkType || medium !== o.medium ||
      year !== o.year || description !== o.description || isUnique !== o.isUnique ||
      series !== o.series || subCategory !== o.subCategory || support !== o.support ||
      signed !== o.signed || height !== o.height || width !== o.width ||
      depth !== o.depth || weight !== o.weight || price !== o.price ||
      currency !== o.currency || artworkLocation !== o.artworkLocation ||
      editionCount !== o.editionCount || artistProofs !== o.artistProofs ||
      exhibitionHistory !== o.exhibitionHistory || provenance !== o.provenance ||
      artistName !== o.artistName || editionNumber !== o.editionNumber ||
      status !== o.status || buyerName !== o.buyerName ||
      (soldDate ? soldDate.toISOString() : "") !== o.soldDate ||
      selectedExhibitionIds.sort().join(",") !== o.selectedExhibitionIds ||
      selectedCatalogueIds.sort().join(",") !== o.selectedCatalogueIds ||
      newImages.length > 0 || deletedImageIds.length > 0 ||
      newDocuments.length > 0 || deletedDocIds.length > 0;
    setHasUnsavedChanges(changed);
  }, [title, artworkType, medium, year, description, isUnique, series, subCategory, support,
    signed, height, width, depth, weight, price, currency, artworkLocation, editionCount,
    artistProofs, exhibitionHistory, provenance, artistName, editionNumber, status, buyerName, soldDate,
    selectedExhibitionIds, selectedCatalogueIds, newImages, deletedImageIds, newDocuments, deletedDocIds, loading]);

  const loadArtwork = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    setCurrentUserId(user.id);

    const { data, error } = await supabase.from("artworks").select("*").eq("id", id!).single();
    if (error || !data) { toast.error("Artwork not found"); navigate("/dashboard"); return; }

    setOwnerId(data.owner_id);
    setVerificationStatus((data as any).verification_status || "pending");
    setTitle(data.title);
    setGlobalArtworkId(data.global_artwork_id);
    setArtworkType(data.artwork_type || "");
    setMedium(data.medium || "");
    setYear(data.year ? String(data.year) : "");
    setDescription(data.description || "");
    setIsUnique(data.is_unique);
    setSeries(data.series || "");
    setSubCategory(data.sub_category || "");
    setSupport(data.support || "");
    setSigned(data.signed || "");
    setHeight(data.height ? String(data.height) : "");
    setWidth(data.width ? String(data.width) : "");
    setDepth(data.depth ? String(data.depth) : "");
    setWeight(data.weight ? String(data.weight) : "");
    setPrice(data.price ? String(data.price) : "");
    setCurrency(data.currency || "EUR");
    setArtworkLocation(data.artwork_location || "");
    setEditionCount(data.edition_count ? String(data.edition_count) : "");
    setArtistProofs(data.artist_proofs ? String(data.artist_proofs) : "");
    setExhibitionHistory(data.exhibition_history || "");
    setProvenance(data.provenance || "");
    setArtistName(data.artist_name || "");
    setEditionNumber(data.edition_number || "");
    setStatus((data as any).status || "available");
    setBuyerName((data as any).buyer_name || "");
    setSoldDate((data as any).sold_date ? new Date((data as any).sold_date) : undefined);

    // Load linked exhibition entries
    const { data: exhLinks } = await supabase
      .from("artwork_exhibitions")
      .select("cv_entry_id")
      .eq("artwork_id", id!);
    if (exhLinks) setSelectedExhibitionIds(exhLinks.map((l: any) => l.cv_entry_id));

    // Load linked catalogues
    const { data: catLinks } = await supabase
      .from("artwork_catalogues")
      .select("catalogue_id")
      .eq("artwork_id", id!);
    if (catLinks) setSelectedCatalogueIds(catLinks.map((l: any) => l.catalogue_id));

    // Load images
    const { data: imgs } = await supabase
      .from("artwork_images")
      .select("*")
      .eq("artwork_id", id!)
      .order("display_order");

    if (imgs) {
      const withUrls = imgs.map((img) => {
        const { data: urlData } = supabase.storage.from("artwork-images").getPublicUrl(img.storage_path);
        return { ...img, publicUrl: urlData.publicUrl };
      });
      setExistingImages(withUrls);
    }

    // Load documents
    const { data: docs } = await supabase
      .from("artwork_documents")
      .select("*")
      .eq("artwork_id", id!)
      .order("created_at");

    if (docs) setDocuments(docs as ArtworkDocument[]);

    // Store original values for dirty tracking
    originalValuesRef.current = {
      title: data.title, artworkType: data.artwork_type || "", medium: data.medium || "",
      year: data.year ? String(data.year) : "", description: data.description || "",
      isUnique: data.is_unique, series: data.series || "", subCategory: data.sub_category || "",
      support: data.support || "", signed: data.signed || "",
      height: data.height ? String(data.height) : "", width: data.width ? String(data.width) : "",
      depth: data.depth ? String(data.depth) : "", weight: data.weight ? String(data.weight) : "",
      price: data.price ? String(data.price) : "", currency: data.currency || "EUR",
      artworkLocation: data.artwork_location || "",
      editionCount: data.edition_count ? String(data.edition_count) : "",
      artistProofs: data.artist_proofs ? String(data.artist_proofs) : "",
      exhibitionHistory: data.exhibition_history || "", provenance: data.provenance || "",
      artistName: data.artist_name || "", editionNumber: data.edition_number || "",
      status: (data as any).status || "available", buyerName: (data as any).buyer_name || "",
      soldDate: (data as any).sold_date ? new Date((data as any).sold_date).toISOString() : "",
      selectedExhibitionIds: exhLinks ? exhLinks.map((l: any) => l.cv_entry_id).sort().join(",") : "",
      selectedCatalogueIds: catLinks ? catLinks.map((l: any) => l.catalogue_id).sort().join(",") : "",
    };
    setHasUnsavedChanges(false);

    setLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); setSaving(false); return; }

    // Update artwork
    const { error } = await supabase.from("artworks").update({
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
      currency,
      artwork_location: status === "sold"
        ? (buyerName.trim() || "Unknown buyer")
        : artworkLocation.trim() || null,
      edition_count: !isUnique && editionCount ? parseInt(editionCount) : null,
      artist_proofs: !isUnique && artistProofs ? parseInt(artistProofs) : null,
      exhibition_history: exhibitionHistory.trim() || null,
      provenance: provenance.trim() || null,
      artist_name: artistName.trim() || null,
      edition_number: editionNumber.trim() || null,
      status,
      buyer_name: status === "sold" ? (buyerName.trim() || null) : null,
      sold_date: status === "sold" && soldDate ? format(soldDate, "yyyy-MM-dd") : null,
    } as any).eq("id", id!);

    if (error) { toast.error("Failed to save"); setSaving(false); return; }

    // When sold, auto-add a location history entry for the buyer
    if (status === "sold") {
      const buyerLocation = buyerName.trim() || "Unknown buyer";
      setArtworkLocation(buyerLocation);
      await supabase.from("artwork_location_history").insert({
        artwork_id: id!,
        location: buyerLocation,
        moved_date: soldDate ? format(soldDate, "yyyy-MM-dd") : null,
        notes: "Sold",
      });
    }

    // Delete removed images
    for (const imgId of deletedImageIds) {
      const img = existingImages.find((i) => i.id === imgId);
      if (img) {
        await supabase.storage.from("artwork-images").remove([img.storage_path]);
        await supabase.from("artwork_images").delete().eq("id", imgId);
      }
    }

    // Upload new images
    const currentMax = existingImages.filter((i) => !deletedImageIds.includes(i.id)).length;
    for (let i = 0; i < newImages.length; i++) {
      const img = newImages[i];
      const ext = img.file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("artwork-images").upload(path, img.file);
      if (upErr) { toast.error(`Failed to upload image ${i + 1}`); continue; }
      await supabase.from("artwork_images").insert({
        artwork_id: id!,
        storage_path: path,
        display_order: currentMax + i,
      });
    }

    // Delete removed documents
    for (const docId of deletedDocIds) {
      const doc = documents.find((d) => d.id === docId);
      if (doc) {
        await supabase.storage.from("artwork-documents").remove([doc.storage_path]);
        await supabase.from("artwork_documents").delete().eq("id", docId);
      }
    }

    // Upload new documents
    for (const file of newDocuments) {
      const path = `${user.id}/${id}/${crypto.randomUUID()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("artwork-documents").upload(path, file);
      if (upErr) { toast.error(`Failed to upload ${file.name}`); continue; }
      await supabase.from("artwork_documents").insert({
        artwork_id: id!,
        file_name: file.name,
        file_type: file.type || null,
        file_size: file.size,
        storage_path: path,
      });
    }

    // Sync exhibition links
    await supabase.from("artwork_exhibitions").delete().eq("artwork_id", id!);
    if (selectedExhibitionIds.length > 0) {
      await supabase.from("artwork_exhibitions").insert(
        selectedExhibitionIds.map((cv_entry_id) => ({ artwork_id: id!, cv_entry_id }))
      );
    }

    // Sync catalogue links
    await supabase.from("artwork_catalogues").delete().eq("artwork_id", id!);
    if (selectedCatalogueIds.length > 0) {
      await supabase.from("artwork_catalogues").insert(
        selectedCatalogueIds.map((catalogue_id) => ({ artwork_id: id!, catalogue_id }))
      );
    }

    toast.success("Artwork saved");
    setSaving(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
    // Reload to refresh state
    setDeletedImageIds([]);
    setDeletedDocIds([]);
    newImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setNewImages([]);
    setNewDocuments([]);
    loadArtwork();
  };

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImages((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleAddDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewDocuments((prev) => [...prev, ...files]);
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const downloadDocument = async (doc: ArtworkDocument) => {
    const { data, error } = await supabase.storage.from("artwork-documents").download(doc.storage_path);
    if (error || !data) { toast.error("Failed to download"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const visibleExistingImages = existingImages.filter((i) => !deletedImageIds.includes(i.id));
  const visibleDocuments = documents.filter((d) => !deletedDocIds.includes(d.id));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!siblingIds.prev}
              onClick={() => siblingIds.prev && navigate(`/artwork/${siblingIds.prev}`)}
              title="Previous artwork"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!siblingIds.next}
              onClick={() => siblingIds.next && navigate(`/artwork/${siblingIds.next}`)}
              title="Next artwork"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-sm text-muted-foreground flex-1 truncate">{title}</span>
          <Button variant="outline" size="sm" onClick={() => navigate(`/artwork/${id}/view`)}>
            <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              hasUnsavedChanges && !saving && !justSaved && "bg-highlight hover:bg-highlight/90 text-highlight-foreground"
            )}
          >
            {saving ? "Saving..." : justSaved ? "Saved ✓" : hasUnsavedChanges ? "Save •" : "Save"}
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Photos */}
        <div>
          <Label className="mb-2 block text-base font-medium">Photos</Label>
          <div className="flex flex-wrap gap-2">
            {visibleExistingImages.map((img) => (
              <div key={img.id} className="relative w-24 h-24 rounded-sm overflow-hidden border border-border">
                <img src={img.publicUrl} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setDeletedImageIds((prev) => [...prev, img.id])}
                  className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {newImages.map((img, i) => (
              <div key={`new-${i}`} className="relative w-24 h-24 rounded-sm overflow-hidden border border-dashed border-border">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(img.preview);
                    setNewImages((prev) => prev.filter((_, j) => j !== i));
                  }}
                  className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-24 h-24 rounded-sm border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-foreground/40 transition-colors"
            >
              <ImagePlus className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Add</span>
            </button>
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
        </div>

        <Separator />

        {/* Core info */}
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
        </div>

        {localStorage.getItem("activeRole") === "collector" && (
          <div>
            <Label htmlFor="artistName">Artist name</Label>
            <Input id="artistName" value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="e.g. Henry Moore" className="mt-1.5" autoComplete="off" />
          </div>
        )}

        <div>
          <Label>Type of artwork</Label>
          <Select value={artworkType} onValueChange={(v) => { setArtworkType(v); if (v !== "Sculpture") setSubCategory(""); }}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {artworkTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {artworkType === "Sculpture" && (
          <div>
            <Label>Sculpture sub-category</Label>
            <Select value={subCategory} onValueChange={setSubCategory}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select sub-category" /></SelectTrigger>
              <SelectContent>
                {sculptureSubCategories.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
            <Label htmlFor="series">Series / Group</Label>
            <Input id="series" value={series} onChange={(e) => setSeries(e.target.value)} className="mt-1.5" autoComplete="off" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Unique work</Label>
            <p className="text-xs text-muted-foreground">Toggle off for editions</p>
          </div>
          <Switch checked={isUnique} onCheckedChange={(v) => { setIsUnique(v); if (v) { setEditionCount(""); setArtistProofs(""); setEditionNumber(""); } }} />
        </div>

        {!isUnique && localStorage.getItem("activeRole") === "collector" && (
          <div>
            <Label htmlFor="editionNumber">Edition number</Label>
            <Input id="editionNumber" value={editionNumber} onChange={(e) => setEditionNumber(e.target.value)} placeholder="e.g. 3/8" className="mt-1.5" autoComplete="off" />
          </div>
        )}

        {/* Multi-size editions for all non-unique works */}
        {!isUnique && id && globalArtworkId > 0 && (
          <>
            <Separator />
            <PhotographySizesManager artworkId={id} globalArtworkId={globalArtworkId} />
          </>
        )}

        <Separator />

        {/* Materials */}
        <div className={cn("grid gap-3", artworkType !== "Sculpture" ? "grid-cols-2" : "grid-cols-1")}>
          <div>
            <Label htmlFor="medium">Medium</Label>
            <Input id="medium" value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="e.g. Oil on canvas" className="mt-1.5" autoComplete="off" />
          </div>
          {artworkType !== "Sculpture" && (
            <div>
              <Label htmlFor="support">Support</Label>
              <Input id="support" value={support} onChange={(e) => setSupport(e.target.value)} placeholder="e.g. Linen" className="mt-1.5" autoComplete="off" />
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="signed">Signed</Label>
          <Input id="signed" value={signed} onChange={(e) => setSigned(e.target.value)} placeholder="e.g. Signed verso" className="mt-1.5" autoComplete="off" />
        </div>

        <Separator />

        {/* Dimensions - hidden for edition works (managed per-size) */}
        {isUnique && (
          <>
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
                <Label htmlFor="location">Current Location</Label>
                <Input id="location" value={artworkLocation} onChange={(e) => setArtworkLocation(e.target.value)} placeholder="e.g. Studio, Storage" className="mt-1.5" autoComplete="off" />
              </div>
            </div>
          </>
        )}

        {!isUnique && (
          <div className="grid grid-cols-1">
            <div>
              <Label htmlFor="location">Current Location</Label>
              <Input id="location" value={artworkLocation} onChange={(e) => setArtworkLocation(e.target.value)} placeholder="e.g. Studio, Storage" className="mt-1.5" autoComplete="off" />
            </div>
          </div>
        )}

        <Separator />

        {/* Status */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Status</Label>
            <p className="text-xs text-muted-foreground">Mark this work as available or sold</p>
          </div>
          <Select value={status} onValueChange={(val) => {
              setStatus(val);
              if (val === "available") {
                setBuyerName("");
                setSoldDate(undefined);
              }
            }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {artworkStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {status === "sold" && (
          <div className="space-y-3">
            <SaleDatePicker date={soldDate} onDateChange={setSoldDate} />
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
          </div>
        )}

        {/* Location History */}
        {id && (
          <LocationHistoryManager
            artworkId={id}
            currentLocation={artworkLocation}
            onLocationChange={(loc) => setArtworkLocation(loc)}
          />
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
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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

        <CataloguePicker
          selectedIds={selectedCatalogueIds}
          onSelectionChange={setSelectedCatalogueIds}
        />

        <div>
          <Label htmlFor="provenance">Provenance</Label>
          <Textarea id="provenance" value={provenance} onChange={(e) => setProvenance(e.target.value)} placeholder="Ownership history…" rows={3} className="mt-1.5" />
        </div>

        <Separator />

        {/* Documents */}
        <div>
          <Label className="mb-2 block text-base font-medium">Documents</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Attach certificates, provenance records, condition reports, invoices etc.
          </p>

          {visibleDocuments.length > 0 && (
            <div className="space-y-2 mb-3">
              {visibleDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-sm border border-border bg-secondary/50">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <button
                    type="button"
                    onClick={() => downloadDocument(doc)}
                    className="text-sm truncate flex-1 text-left hover:underline"
                  >
                    {doc.file_name}
                  </button>
                  {doc.file_size && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {(doc.file_size / 1024).toFixed(0)} KB
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeletedDocIds((prev) => [...prev, doc.id])}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {newDocuments.length > 0 && (
            <div className="space-y-2 mb-3">
              {newDocuments.map((file, i) => (
                <div key={`new-doc-${i}`} className="flex items-center gap-3 p-2.5 rounded-sm border border-dashed border-border">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewDocuments((prev) => prev.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => docInputRef.current?.click()}
            className="gap-2"
          >
            <FileUp className="w-4 h-4" /> Add Document
          </Button>
          <input
            ref={docInputRef}
            type="file"
            accept={acceptedDocTypes}
            multiple
            onChange={handleAddDocs}
            className="hidden"
          />
        </div>

        <Separator />

        <div className="flex justify-end pb-8">
          <Button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              hasUnsavedChanges && !saving && !justSaved && "bg-highlight hover:bg-highlight/90 text-highlight-foreground"
            )}
          >
            {saving ? "Saving..." : justSaved ? "Saved ✓" : hasUnsavedChanges ? "Save Changes •" : "Save Changes"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ArtworkDetail;
