import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, X } from "lucide-react";

interface GalleryRecord {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  established_year: number | null;
  website: string | null;
}

interface SelectedGallery {
  name: string;
  phone: string;
  website: string;
}

interface GallerySearchProps {
  galleries: SelectedGallery[];
  onGalleriesChange: (galleries: SelectedGallery[]) => void;
}

const GallerySearch = ({ galleries, onGalleriesChange }: GallerySearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GalleryRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const { data, error } = await supabase
        .from("galleries")
        .select("*")
        .ilike("name", `%${query}%`)
        .limit(20);

      if (!error && data) {
        setResults(data);
        setShowDropdown(true);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const addGalleryFromSearch = (gallery: GalleryRecord) => {
    const newGallery: SelectedGallery = {
      name: gallery.name,
      phone: "",
      website: gallery.website || "",
    };
    onGalleriesChange([...galleries, newGallery]);
    setQuery("");
    setShowDropdown(false);
  };

  const addCustomGallery = () => {
    onGalleriesChange([...galleries, { name: "", phone: "", website: "" }]);
  };

  const removeGallery = (index: number) => {
    onGalleriesChange(galleries.filter((_, i) => i !== index));
  };

  const updateGallery = (index: number, field: keyof SelectedGallery, value: string) => {
    const updated = [...galleries];
    updated[index] = { ...updated[index], [field]: value };
    onGalleriesChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
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
          <div key={i} className="p-4 rounded-sm border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Gallery {i + 1}</span>
              <Button variant="ghost" size="icon" onClick={() => removeGallery(i)}>
                <X className="w-4 h-4 text-destructive" />
              </Button>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GallerySearch;
