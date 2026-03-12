import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Artwork {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
  image_url: string | null;
  thumbnailUrl: string | null;
}

interface ExhibitionArtworkPickerProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const ExhibitionArtworkPicker = ({ selectedIds, onSelectionChange }: ExhibitionArtworkPickerProps) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("artworks")
        .select("id, title, year, medium, image_url")
        .eq("owner_id", user.id)
        .order("year", { ascending: false });

      if (!data) { setLoading(false); return; }

      // Fetch first image for each artwork in parallel
      const artworkIds = data.map((a) => a.id);
      const { data: images } = await supabase
        .from("artwork_images")
        .select("artwork_id, storage_path, display_order")
        .in("artwork_id", artworkIds)
        .order("display_order");

      // Build a map: artwork_id -> first image public URL
      const thumbMap: Record<string, string> = {};
      if (images) {
        for (const img of images) {
          if (!thumbMap[img.artwork_id]) {
            const { data: urlData } = supabase.storage
              .from("artwork-images")
              .getPublicUrl(img.storage_path);
            if (urlData) thumbMap[img.artwork_id] = urlData.publicUrl;
          }
        }
      }

      setArtworks(
        data.map((a) => ({
          ...a,
          thumbnailUrl: thumbMap[a.id] || null,
        }))
      );
      setLoading(false);
    };
    load();
  }, []);

  if (!loading && artworks.length === 0) return null;

  const toggle = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const selectedArtworks = artworks.filter((a) => selectedIds.includes(a.id));
  const filtered = artworks.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const Thumb = ({ art }: { art: Artwork }) => {
    const src = art.thumbnailUrl || art.image_url;
    return (
      <div className="w-10 h-10 rounded-sm bg-secondary overflow-hidden shrink-0">
        {src ? (
          <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[8px]">—</div>
        )}
      </div>
    );
  };

  return (
    <div>
      <Label className="mb-1.5 block">Artworks in this exhibition</Label>

      {selectedArtworks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedArtworks.map((art) => (
            <Badge key={art.id} variant="secondary" className="gap-1.5 pr-1 pl-1 py-0.5 font-normal text-xs h-auto">
              <Thumb art={art} />
              <span className="truncate max-w-[160px]">
                {art.title}{art.year ? ` (${art.year})` : ""}
              </span>
              <button
                type="button"
                onClick={() => toggle(art.id)}
                className="ml-0.5 hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            className="w-full justify-between font-normal text-sm"
          >
            {loading ? "Loading..." : `Select artworks (${selectedIds.length} selected)`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[420px] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-2 border-b">
            <Input
              placeholder="Search artworks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <ScrollArea className="h-72">
            <div className="p-2 space-y-0.5">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 text-center">
                {artworks.length === 0 ? "No artworks found. Add artworks first." : "No matches."}
              </p>
            )}
            {filtered.map((art) => (
              <button
                key={art.id}
                type="button"
                onClick={() => toggle(art.id)}
                className="flex items-center gap-2.5 w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-accent transition-colors"
              >
                <Checkbox
                  checked={selectedIds.includes(art.id)}
                  className="shrink-0"
                  tabIndex={-1}
                />
                <Thumb art={art} />
                <div className="min-w-0">
                  <span className="text-sm leading-tight line-clamp-1">{art.title}</span>
                  <div className="flex gap-1.5 text-muted-foreground text-xs">
                    {art.year && <span>{art.year}</span>}
                    {art.medium && <span>— {art.medium}</span>}
                  </div>
                </div>
              </button>
            ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};
