import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Camera, X, Check, ArrowLeft, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AppRole = "artist" | "collector" | "registrar";

const ARTWORK_TYPES = ["Painting", "Drawing", "Collage", "Print", "Photography", "Sculpture"];
const SCULPTURE_SUB_CATEGORIES = ["Modelled", "Casted", "Carved", "Assembled", "3D printed"];

interface ClientOption {
  owner_id: string;
  full_name: string;
  role: "artist" | "collector";
}

interface CapturedItem {
  id: string;
  title: string;
  thumb: string;
}

const Capture = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [activeRole, setActiveRole] = useState<AppRole>("artist");
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);

  // Registrar mode: pick a client
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);

  // Form state
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [year, setYear] = useState("");
  const [artworkType, setArtworkType] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [series, setSeries] = useState("");
  const [isUnique, setIsUnique] = useState(true);
  const [editionNumber, setEditionNumber] = useState("");
  const [editionCount, setEditionCount] = useState("");
  const [artistProofs, setArtistProofs] = useState("");
  const [medium, setMedium] = useState("");
  const [support, setSupport] = useState("");
  const [signed, setSigned] = useState("");
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Recently captured this session
  const [recent, setRecent] = useState<CapturedItem[]>([]);


  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login?redirect=/capture");
        return;
      }
      setUserId(user.id);

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (rolesData || [])
        .map((r: any) => r.role as AppRole)
        .filter((r) => ["artist", "collector", "registrar"].includes(r));
      setAvailableRoles(roles);

      const saved = localStorage.getItem("activeRole") as AppRole | null;
      const initial = saved && roles.includes(saved) ? saved : (roles[0] || "artist");
      setActiveRole(initial);
      setAuthLoading(false);
    })();
  }, [navigate]);

  // Load registrar clients when needed
  useEffect(() => {
    if (activeRole !== "registrar" || !userId) return;
    (async () => {
      const { data: access } = await supabase
        .from("registrar_access")
        .select("owner_id")
        .eq("registrar_id", userId)
        .eq("status", "approved");
      const ownerIds = (access || []).map((a: any) => a.owner_id);
      if (ownerIds.length === 0) {
        setClients([]);
        return;
      }
      const [{ data: profs }, { data: rolesRows }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", ownerIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", ownerIds),
      ]);
      const list: ClientOption[] = (profs || []).map((p: any) => {
        const userRoles = (rolesRows || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role);
        const role: "artist" | "collector" =
          userRoles.includes("artist") ? "artist" : userRoles.includes("collector") ? "collector" : "artist";
        return { owner_id: p.user_id, full_name: p.full_name || "Unnamed", role };
      });
      setClients(list);
    })();
  }, [activeRole, userId]);

  const effectiveOwnerId = activeRole === "registrar" ? selectedClient?.owner_id : userId;
  const effectiveRoleContext: "artist" | "collector" =
    activeRole === "registrar" ? (selectedClient?.role || "artist") : (activeRole as "artist" | "collector");
  const isCollectorContext = effectiveRoleContext === "collector";



  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const next = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (i: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const reset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setTitle("");
    setArtistName("");
    setYear("");
    setArtworkType("");
    setSubCategory("");
    setSeries("");
    setIsUnique(true);
    setEditionNumber("");
    setEditionCount("");
    setArtistProofs("");
    setMedium("");
    setSupport("");
    setSigned("");
    setHeight("");
    setWidth("");
    setDepth("");
    setNotes("");
  };

  const save = async (addAnother: boolean) => {
    if (!effectiveOwnerId) {
      toast.error("Pick a client first");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (photos.length === 0) {
      toast.error("Add at least one photo");
      return;
    }
    setSaving(true);

    const isSculpture = artworkType === "Sculpture";
    const insertData: Record<string, unknown> = {
      owner_id: effectiveOwnerId,
      title: title.trim(),
      year: year ? parseInt(year) : null,
      artwork_type: artworkType || null,
      sub_category: isSculpture && subCategory ? subCategory : null,
      series: series.trim() || null,
      medium: medium.trim() || null,
      support: !isSculpture && support.trim() ? support.trim() : null,
      signed: signed.trim() || null,
      height: height ? parseFloat(height) : null,
      width: width ? parseFloat(width) : null,
      depth: depth ? parseFloat(depth) : null,
      description: notes.trim() || null,
      role_context: effectiveRoleContext,
      artist_name: isCollectorContext && artistName.trim() ? artistName.trim() : null,
      is_unique: isUnique,
      edition_number: !isUnique && editionNumber.trim() ? editionNumber.trim() : null,
      edition_count: !isUnique && editionCount ? parseInt(editionCount) : null,
      artist_proofs: !isUnique && artistProofs ? parseInt(artistProofs) : null,
      status: "available",
    };

    const { data: artwork, error } = await supabase
      .from("artworks")
      .insert(insertData as any)
      .select("id")
      .single();

    if (error || !artwork) {
      console.error(error);
      toast.error("Failed to save artwork");
      setSaving(false);
      return;
    }

    // Upload photos
    let firstThumb = "";
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const ext = p.file.name.split(".").pop() || "jpg";
      const path = `${effectiveOwnerId}/${artwork.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("artwork-images")
        .upload(path, p.file, { contentType: p.file.type });
      if (upErr) {
        toast.error(`Failed to upload photo ${i + 1}`);
        continue;
      }
      await supabase.from("artwork_images").insert({
        artwork_id: artwork.id,
        storage_path: path,
        display_order: i,
      });
      if (i === 0) {
        firstThumb = supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;
      }
    }

    setRecent((prev) => [{ id: artwork.id, title: title.trim(), thumb: firstThumb }, ...prev].slice(0, 8));
    toast.success("Artwork captured");
    setSaving(false);

    if (addAnother) {
      reset();
    } else {
      reset();
      navigate(`/artwork/${artwork.id}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-md hover:bg-accent"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold flex-1">Capture</h1>
          {availableRoles.length > 1 && (
            <Select
              value={activeRole}
              onValueChange={(v) => {
                setActiveRole(v as AppRole);
                localStorage.setItem("activeRole", v);
                setSelectedClient(null);
              }}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 pb-32">
        {/* Registrar client picker */}
        {activeRole === "registrar" && (
          <div className="mb-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Capturing for</Label>
            {clients.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No clients have granted you access yet.
              </p>
            ) : (
              <Select
                value={selectedClient?.owner_id || ""}
                onValueChange={(v) => setSelectedClient(clients.find((c) => c.owner_id === v) || null)}
              >
                <SelectTrigger className="mt-2 h-12 text-base">
                  <SelectValue placeholder="Select a client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.owner_id} value={c.owner_id}>
                      {c.full_name} <span className="text-muted-foreground capitalize">· {c.role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}


        {/* Photo capture area */}
        <div className="mb-5">
          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-border bg-secondary/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-foreground/40 transition-colors"
            >
              <Camera className="w-10 h-10" strokeWidth={1.5} />
              <span className="text-sm font-medium">Take photo</span>
              <span className="text-xs">Tap to open camera</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-border">
                    <img src={p.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-background/85 rounded-full p-1"
                      aria-label="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-foreground/40"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px] mt-1">Add</span>
                </button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="mt-1.5 h-11 text-base"
              autoComplete="off"
            />
          </div>

          {isCollectorContext && (
            <div>
              <Label htmlFor="artistName">Artist name</Label>
              <Input
                id="artistName"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="e.g. Henry Moore"
                className="mt-1.5 h-11 text-base"
                autoComplete="off"
              />
            </div>
          )}

          {/* Type of artwork */}
          <div>
            <Label htmlFor="artworkType">Type of artwork</Label>
            <Select
              value={artworkType}
              onValueChange={(v) => {
                setArtworkType(v);
                if (v !== "Sculpture") setSubCategory("");
              }}
            >
              <SelectTrigger id="artworkType" className="mt-1.5 h-11 text-base">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {ARTWORK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {artworkType === "Sculpture" && (
            <div>
              <Label htmlFor="subCategory">Sculpture sub-category</Label>
              <Select value={subCategory} onValueChange={setSubCategory}>
                <SelectTrigger id="subCategory" className="mt-1.5 h-11 text-base">
                  <SelectValue placeholder="Select sub-category…" />
                </SelectTrigger>
                <SelectContent>
                  {SCULPTURE_SUB_CATEGORIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="year">Date of creation</Label>
              <Input
                id="year"
                type="number"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2026"
                className="mt-1.5 h-11 text-base"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="series">Series / Group</Label>
              <Input
                id="series"
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                placeholder="e.g. Abstrakt"
                className="mt-1.5 h-11 text-base"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Unique work toggle */}
          <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
            <div className="min-w-0">
              <Label htmlFor="isUnique" className="block">Unique work</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Toggle off for editions</p>
            </div>
            <Switch
              id="isUnique"
              checked={isUnique}
              onCheckedChange={(v) => setIsUnique(v)}
            />
          </div>

          {!isUnique && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="editionNumber" className="text-xs">Edition #</Label>
                <Input
                  id="editionNumber"
                  value={editionNumber}
                  onChange={(e) => setEditionNumber(e.target.value)}
                  placeholder="e.g. 1"
                  className="mt-1.5 h-11 text-base"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="editionCount" className="text-xs">Edition of</Label>
                <Input
                  id="editionCount"
                  type="number"
                  inputMode="numeric"
                  value={editionCount}
                  onChange={(e) => setEditionCount(e.target.value)}
                  placeholder="e.g. 5"
                  className="mt-1.5 h-11 text-base"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="artistProofs" className="text-xs">AP</Label>
                <Input
                  id="artistProofs"
                  type="number"
                  inputMode="numeric"
                  value={artistProofs}
                  onChange={(e) => setArtistProofs(e.target.value)}
                  placeholder="0"
                  className="mt-1.5 h-11 text-base"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          <div className={artworkType === "Sculpture" ? "" : "grid grid-cols-2 gap-3"}>
            <div>
              <Label htmlFor="medium">Medium</Label>
              <Input
                id="medium"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                placeholder={artworkType === "Sculpture" ? "e.g. Bronze" : "e.g. Oil"}
                className="mt-1.5 h-11 text-base"
                autoComplete="off"
              />
            </div>
            {artworkType !== "Sculpture" && (
              <div>
                <Label htmlFor="support">Support</Label>
                <Input
                  id="support"
                  value={support}
                  onChange={(e) => setSupport(e.target.value)}
                  placeholder="e.g. Canvas"
                  className="mt-1.5 h-11 text-base"
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="signed">Signed</Label>
            <Input
              id="signed"
              value={signed}
              onChange={(e) => setSigned(e.target.value)}
              placeholder="e.g. Signed verso"
              className="mt-1.5 h-11 text-base"
              autoComplete="off"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dimensions (cm)</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              <Input
                type="number"
                inputMode="decimal"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="H"
                className="h-11 text-base text-center"
              />
              <Input
                type="number"
                inputMode="decimal"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="W"
                className="h-11 text-base text-center"
              />
              <Input
                type="number"
                inputMode="decimal"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                placeholder="D"
                className="h-11 text-base text-center"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember…"
              className="mt-1.5 text-base min-h-[80px]"
            />
          </div>
        </div>

        {/* Recently captured */}
        {recent.length > 0 && (
          <div className="mt-8">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">This session</Label>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
              {recent.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/artwork/${r.id}`)}
                  className="shrink-0 w-16"
                >
                  <div className="w-16 h-16 rounded-md overflow-hidden border border-border bg-secondary">
                    {r.thumb && <img src={r.thumb} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <p className="text-[10px] mt-1 truncate text-muted-foreground">{r.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>


      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12"
            disabled={saving}
            onClick={() => save(true)}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1.5" /> Save & add another</>}
          </Button>
          <Button
            className="flex-1 h-12"
            disabled={saving}
            onClick={() => save(false)}
          >
            Save & open
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Capture;
