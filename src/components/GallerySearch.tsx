import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Plus, X, Loader2, Sparkles, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface GalleryRecord {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  established_year: number | null;
  website: string | null;
}

export interface SelectedGallery {
  name: string;
  phone: string;
  website: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  hours?: string;
  description?: string;
  photo_url?: string;
}

interface GallerySearchProps {
  galleries: SelectedGallery[];
  onGalleriesChange: (galleries: SelectedGallery[]) => void;
}

const emptyGallery = (): SelectedGallery => ({
  name: "", phone: "", website: "", email: "",
  address: "", city: "", country: "", hours: "", description: "", photo_url: "",
});

const GallerySearch = ({ galleries, onGalleriesChange }: GallerySearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GalleryRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [lookingUp, setLookingUp] = useState<number | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data, error } = await supabase.rpc("search_galleries", { _query: query });

      if (!error && data) {
        setResults(data);
        setShowDropdown(true);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const mergeLookup = (current: SelectedGallery, data: any): SelectedGallery => {
    const next = { ...current };
    const fields: (keyof SelectedGallery)[] = [
      "website", "phone", "email", "address", "city", "country", "hours", "description",
    ];
    for (const f of fields) {
      const value = (data?.[f] || "").trim?.() ?? "";
      if (value && !next[f]) (next as any)[f] = value;
    }
    return next;
  };

  const lookupGalleryInfo = async (index: number) => {
    const gallery = galleries[index];
    setLookingUp(index);
    try {
      const { data, error } = await supabase.functions.invoke("gallery-lookup", {
        body: { gallery_name: gallery.name, city: gallery.city || null, country: gallery.country || null },
      });

      if (error) {
        toast.error("Could not look up gallery info");
        return;
      }

      const merged = mergeLookup(gallery, data);
      if (JSON.stringify(merged) !== JSON.stringify(gallery)) {
        const updated = [...galleries];
        updated[index] = merged;
        onGalleriesChange(updated);
        toast.success("Gallery info found");
      } else {
        toast.info("No new information found for this gallery");
      }
    } catch {
      toast.error("Failed to look up gallery info");
    } finally {
      setLookingUp(null);
    }
  };

  const addGalleryFromSearch = async (gallery: GalleryRecord) => {
    const newGallery: SelectedGallery = {
      ...emptyGallery(),
      name: gallery.name,
      website: gallery.website || "",
      city: gallery.city || "",
      country: gallery.country || "",
    };
    const updated = [...galleries, newGallery];
    onGalleriesChange(updated);
    setQuery("");
    setShowDropdown(false);

    const newIndex = updated.length - 1;
    setLookingUp(newIndex);
    try {
      const { data, error } = await supabase.functions.invoke("gallery-lookup", {
        body: { gallery_name: gallery.name, city: gallery.city, country: gallery.country },
      });

      if (error) {
        console.error("Gallery lookup error:", error);
        toast.error("Could not look up gallery info");
        return;
      }

      const merged = mergeLookup(newGallery, data);
      const finalList = [...updated];
      finalList[newIndex] = merged;
      onGalleriesChange(finalList);
      toast.success("Gallery info found");
    } catch (e) {
      console.error("Gallery lookup exception:", e);
      toast.error("Failed to look up gallery info");
    } finally {
      setLookingUp(null);
    }
  };

  const addCustomGallery = () => {
    onGalleriesChange([...galleries, emptyGallery()]);
  };

  const removeGallery = (index: number) => {
    onGalleriesChange(galleries.filter((_, i) => i !== index));
  };

  const updateGallery = (index: number, field: keyof SelectedGallery, value: string) => {
    const updated = [...galleries];
    updated[index] = { ...updated[index], [field]: value };
    onGalleriesChange(updated);
  };

  const uploadPhoto = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Please choose an image under 10 MB");
      return;
    }
    setUploading(index);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        toast.error("Please sign in again");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/galleries/${Date.now()}-${index}.${ext}`;
      const { error } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
      if (error) {
        toast.error("Upload failed");
        return;
      }
      const { data: pub } = supabase.storage.from("profile-photos").getPublicUrl(path);
      updateGallery(index, "photo_url", pub.publicUrl);
      toast.success("Photo added");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search galleries worldwide…"
            className="pl-10"
          />
        </div>

        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {results.map((gallery) => (
              <button
                key={gallery.id}
                onClick={() => addGalleryFromSearch(gallery)}
                className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors border-b border-border last:border-0"
              >
                <div className="font-medium text-sm">{gallery.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[gallery.city, gallery.country].filter(Boolean).join(", ")}
                  {gallery.established_year ? ` · Est. ${gallery.established_year}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}

        {showDropdown && query.length >= 2 && results.length === 0 && !searching && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3">
            <p className="text-sm text-muted-foreground">No galleries found for "{query}"</p>
          </div>
        )}
      </div>

      {/* Add custom gallery button */}
      <Button variant="outline" size="sm" onClick={addCustomGallery} className="gap-1">
        <Plus className="w-3.5 h-3.5" /> Add Custom Gallery
      </Button>

      {/* Selected galleries */}
      {galleries.length === 0 && (
        <p className="text-sm text-muted-foreground">No galleries added yet. Search above or add a custom one.</p>
      )}

      <div className="space-y-3">
        {galleries.map((gallery, i) => (
          <div key={i} className="p-4 rounded-sm border border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Gallery {i + 1}
                {lookingUp === i && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-primary">
                    <Loader2 className="w-3 h-3 animate-spin" /> Finding gallery details…
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1">
                {gallery.name && lookingUp !== i && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => lookupGalleryInfo(i)}
                    className="gap-1 text-xs h-7"
                  >
                    <Sparkles className="w-3 h-3" /> Find info
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => removeGallery(i)}>
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                value={gallery.name}
                onChange={(e) => updateGallery(i, "name", e.target.value)}
                placeholder="Gallery name"
              />
              <Input
                value={gallery.phone}
                onChange={(e) => updateGallery(i, "phone", e.target.value)}
                placeholder="Phone"
              />
              <Input
                value={gallery.website}
                onChange={(e) => updateGallery(i, "website", e.target.value)}
                placeholder="Website URL"
              />
              <Input
                value={gallery.email || ""}
                onChange={(e) => updateGallery(i, "email", e.target.value)}
                placeholder="Email"
              />
              <Input
                value={gallery.city || ""}
                onChange={(e) => updateGallery(i, "city", e.target.value)}
                placeholder="City"
              />
              <Input
                value={gallery.country || ""}
                onChange={(e) => updateGallery(i, "country", e.target.value)}
                placeholder="Country"
              />
              <Input
                className="sm:col-span-2"
                value={gallery.address || ""}
                onChange={(e) => updateGallery(i, "address", e.target.value)}
                placeholder="Street address"
              />
              <Input
                value={gallery.hours || ""}
                onChange={(e) => updateGallery(i, "hours", e.target.value)}
                placeholder="Opening hours"
              />
            </div>

            <Textarea
              value={gallery.description || ""}
              onChange={(e) => updateGallery(i, "description", e.target.value)}
              placeholder="Short description of the gallery"
              rows={2}
            />

            <div className="flex items-center gap-4">
              {gallery.photo_url ? (
                <img
                  src={gallery.photo_url}
                  alt={`${gallery.name || "Gallery"} photograph`}
                  className="h-20 w-28 rounded-sm object-cover border border-border"
                />
              ) : (
                <div className="h-20 w-28 rounded-sm border border-dashed border-border flex items-center justify-center text-muted-foreground">
                  <ImagePlus className="w-5 h-5" />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor={`gallery-photo-${i}`} className="text-xs text-muted-foreground">
                  Gallery photo (optional)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`gallery-photo-${i}`}
                    type="file"
                    accept="image/*"
                    className="h-9 text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPhoto(i, file);
                      e.target.value = "";
                    }}
                  />
                  {uploading === i && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {gallery.photo_url && uploading !== i && (
                    <Button variant="ghost" size="icon" onClick={() => updateGallery(i, "photo_url", "")}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GallerySearch;
