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

interface Artwork {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
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
        .select("id, title, year, medium")
        .eq("owner_id", user.id)
        .order("year", { ascending: false });
      if (data) setArtworks(data);
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

  return (
    <div>
      <Label className="mb-1.5 block">Artworks in this exhibition</Label>

      {selectedArtworks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedArtworks.map((art) => (
            <Badge key={art.id} variant="secondary" className="gap-1 pr-1 font-normal text-xs">
              <span className="truncate max-w-[200px]">
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
        <PopoverContent className="w-[380px] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Search artworks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
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
                className="flex items-start gap-2 w-full text-left text-sm px-2 py-2 rounded-sm hover:bg-accent transition-colors"
              >
                <Checkbox
                  checked={selectedIds.includes(art.id)}
                  className="mt-0.5 shrink-0"
                  tabIndex={-1}
                />
                <div className="min-w-0">
                  <span className="text-sm">{art.title}</span>
                  {art.year && (
                    <span className="text-muted-foreground text-xs ml-1.5">({art.year})</span>
                  )}
                  {art.medium && (
                    <span className="text-muted-foreground text-xs ml-1.5">— {art.medium}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
