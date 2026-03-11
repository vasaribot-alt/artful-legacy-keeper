import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("catalogues")
        .select("id, title, publication_year, publisher")
        .eq("user_id", user.id)
        .order("publication_year", { ascending: false });
      if (data) setCatalogues(data as Catalogue[]);
    };
    load();
  }, []);

  if (catalogues.length === 0) return null;

  const toggle = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div>
      <Label className="mb-2 block">Catalogues</Label>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {catalogues.map((c) => (
          <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={selectedIds.includes(c.id)}
              onCheckedChange={() => toggle(c.id)}
            />
            <span>{c.title}</span>
            {c.publication_year && (
              <span className="text-xs text-muted-foreground">({c.publication_year})</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
};
