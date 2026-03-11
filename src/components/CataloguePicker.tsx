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

interface Catalogue {
  id: string;
  title: string;
  publication_year: number | null;
  publisher: string | null;
}

interface CataloguePickerProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const CataloguePicker = ({ selectedIds, onSelectionChange }: CataloguePickerProps) => {
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("catalogues")
        .select("id, title, publication_year, publisher")
        .eq("user_id", user.id)
        .order("publication_year", { ascending: false });
      if (data) setCatalogues(data as Catalogue[]);
      setLoading(false);
    };
    load();
  }, []);

  if (!loading && catalogues.length === 0) return null;

  const toggle = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const selectedCatalogues = catalogues.filter((c) => selectedIds.includes(c.id));

  return (
    <div>
      <Label className="mb-1.5 block">Catalogues</Label>

      {selectedCatalogues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedCatalogues.map((cat) => (
            <Badge key={cat.id} variant="secondary" className="gap-1 pr-1 font-normal text-xs">
              <span className="truncate max-w-[200px]">
                {cat.title}{cat.publication_year ? ` (${cat.publication_year})` : ""}
              </span>
              <button
                type="button"
                onClick={() => toggle(cat.id)}
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
            {loading ? "Loading..." : `Select from catalogues (${selectedIds.length} selected)`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0" align="start">
          <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
            {catalogues.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 text-center">
                No catalogues found. Add catalogues first.
              </p>
            )}
            {catalogues.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggle(cat.id)}
                className="flex items-start gap-2 w-full text-left text-sm px-2 py-2 rounded-sm hover:bg-accent transition-colors"
              >
                <Checkbox
                  checked={selectedIds.includes(cat.id)}
                  className="mt-0.5 shrink-0"
                  tabIndex={-1}
                />
                <div className="min-w-0">
                  <span className="text-sm">{cat.title}</span>
                  {cat.publication_year && (
                    <span className="text-muted-foreground text-xs ml-1.5">({cat.publication_year})</span>
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
