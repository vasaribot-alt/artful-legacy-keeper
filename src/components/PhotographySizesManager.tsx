import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronDown, ChevronRight, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface ArtworkSize {
  id: string;
  artwork_id: string;
  size_label: string;
  height: number | null;
  width: number | null;
  edition_count: number;
  artist_proofs: number;
  price: number | null;
  currency: string | null;
}

interface EditionItem {
  id: string;
  artwork_size_id: string;
  edition_label: string;
  is_ap: boolean;
  status: string;
  buyer_name: string | null;
  sold_date: string | null;
  artwork_location: string | null;
  provenance: string | null;
}

interface Props {
  artworkId: string;
  globalArtworkId: number;
}

const currencies = ["EUR", "USD", "GBP", "SEK", "NOK", "DKK", "CHF"];

const formatGawid = (globalId: number, sizeLabel: string, editionLabel: string) => {
  return `GAWID-${String(globalId).padStart(8, "0")}-${sizeLabel}-${editionLabel}`;
};

export const PhotographySizesManager = ({ artworkId, globalArtworkId }: Props) => {
  const [sizes, setSizes] = useState<ArtworkSize[]>([]);
  const [editionItems, setEditionItems] = useState<Record<string, EditionItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [openSizes, setOpenSizes] = useState<Set<string>>(new Set());
  const [savingEdition, setSavingEdition] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: sizesData } = await supabase
      .from("artwork_sizes")
      .select("*")
      .eq("artwork_id", artworkId)
      .order("size_label");

    if (sizesData) {
      setSizes(sizesData as any);
      const itemsMap: Record<string, EditionItem[]> = {};
      await Promise.all(
        sizesData.map(async (s: any) => {
          const { data: items } = await supabase
            .from("edition_items")
            .select("*")
            .eq("artwork_size_id", s.id)
            .order("edition_label");
          itemsMap[s.id] = (items || []) as any;
        })
      );
      setEditionItems(itemsMap);
    }
    setLoading(false);
  }, [artworkId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getNextLabel = () => {
    const used = sizes.map((s) => s.size_label);
    for (let i = 0; i < 26; i++) {
      const label = String.fromCharCode(65 + i);
      if (!used.includes(label)) return label;
    }
    return "Z";
  };

  const handleAddSize = async () => {
    const label = getNextLabel();
    const { data, error } = await supabase
      .from("artwork_sizes")
      .insert({
        artwork_id: artworkId,
        size_label: label,
        edition_count: 1,
        artist_proofs: 0,
        currency: "EUR",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add size");
      return;
    }

    // Create the single default edition item
    await supabase.from("edition_items").insert({
      artwork_size_id: data.id,
      edition_label: "1",
      is_ap: false,
    });

    toast.success(`Size ${label} added`);
    setOpenSizes((prev) => new Set(prev).add(data.id));
    loadData();
  };

  const handleUpdateSize = async (sizeId: string, updates: Partial<ArtworkSize>) => {
    const { error } = await supabase
      .from("artwork_sizes")
      .update(updates)
      .eq("id", sizeId);

    if (error) {
      toast.error("Failed to update size");
      return;
    }

    setSizes((prev) =>
      prev.map((s) => (s.id === sizeId ? { ...s, ...updates } : s))
    );
  };

  const handleSaveSizeEditions = async (size: ArtworkSize, newEditionCount: number, newApCount: number) => {
    // Update size record
    await supabase
      .from("artwork_sizes")
      .update({ edition_count: newEditionCount, artist_proofs: newApCount })
      .eq("id", size.id);

    const existing = editionItems[size.id] || [];
    const existingRegular = existing.filter((e) => !e.is_ap);
    const existingAp = existing.filter((e) => e.is_ap);

    // Add missing regular editions
    for (let i = existingRegular.length + 1; i <= newEditionCount; i++) {
      await supabase.from("edition_items").insert({
        artwork_size_id: size.id,
        edition_label: String(i),
        is_ap: false,
      });
    }
    // Remove excess regular editions (only if unsold)
    for (let i = existingRegular.length; i > newEditionCount; i--) {
      const item = existingRegular[i - 1];
      if (item && item.status === "available") {
        await supabase.from("edition_items").delete().eq("id", item.id);
      }
    }

    // Add missing APs
    for (let i = existingAp.length + 1; i <= newApCount; i++) {
      await supabase.from("edition_items").insert({
        artwork_size_id: size.id,
        edition_label: `${i}AP`,
        is_ap: true,
      });
    }
    // Remove excess APs (only if unsold)
    for (let i = existingAp.length; i > newApCount; i--) {
      const item = existingAp[i - 1];
      if (item && item.status === "available") {
        await supabase.from("edition_items").delete().eq("id", item.id);
      }
    }

    loadData();
    toast.success("Editions updated");
  };

  const handleDeleteSize = async (sizeId: string) => {
    const items = editionItems[sizeId] || [];
    const hasSold = items.some((e) => e.status === "sold");
    if (hasSold) {
      toast.error("Cannot delete a size with sold editions");
      return;
    }
    const { error } = await supabase.from("artwork_sizes").delete().eq("id", sizeId);
    if (error) {
      toast.error("Failed to delete size");
      return;
    }
    toast.success("Size deleted");
    loadData();
  };

  const handleUpdateEdition = async (item: EditionItem, updates: Partial<EditionItem>) => {
    setSavingEdition(item.id);
    const { error } = await supabase
      .from("edition_items")
      .update(updates)
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to update edition");
    } else {
      setEditionItems((prev) => ({
        ...prev,
        [item.artwork_size_id]: (prev[item.artwork_size_id] || []).map((e) =>
          e.id === item.id ? { ...e, ...updates } : e
        ),
      }));
    }
    setSavingEdition(null);
  };

  const toggleSize = (id: string) => {
    setOpenSizes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="h-20 bg-secondary animate-pulse rounded-sm" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Photography Sizes & Editions</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each size has its own dimensions, edition count, and price. Every edition gets a unique registration number.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddSize} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Size
        </Button>
      </div>

      {sizes.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-sm">
          No sizes added yet. Click "Add Size" to create your first size variant.
        </p>
      )}

      {sizes.map((size) => (
        <SizeCard
          key={size.id}
          size={size}
          editions={editionItems[size.id] || []}
          globalArtworkId={globalArtworkId}
          isOpen={openSizes.has(size.id)}
          onToggle={() => toggleSize(size.id)}
          onUpdateSize={handleUpdateSize}
          onSaveEditions={handleSaveSizeEditions}
          onDeleteSize={handleDeleteSize}
          onUpdateEdition={handleUpdateEdition}
          savingEdition={savingEdition}
        />
      ))}
    </div>
  );
};

interface SizeCardProps {
  size: ArtworkSize;
  editions: EditionItem[];
  globalArtworkId: number;
  isOpen: boolean;
  onToggle: () => void;
  onUpdateSize: (id: string, updates: Partial<ArtworkSize>) => void;
  onSaveEditions: (size: ArtworkSize, editions: number, aps: number) => void;
  onDeleteSize: (id: string) => void;
  onUpdateEdition: (item: EditionItem, updates: Partial<EditionItem>) => void;
  savingEdition: string | null;
}

const SizeCard = ({
  size, editions, globalArtworkId, isOpen, onToggle,
  onUpdateSize, onSaveEditions, onDeleteSize, onUpdateEdition, savingEdition,
}: SizeCardProps) => {
  const [localEditionCount, setLocalEditionCount] = useState(String(size.edition_count));
  const [localApCount, setLocalApCount] = useState(String(size.artist_proofs));
  const [localHeight, setLocalHeight] = useState(size.height ? String(size.height) : "");
  const [localWidth, setLocalWidth] = useState(size.width ? String(size.width) : "");
  const [localPrice, setLocalPrice] = useState(size.price ? String(size.price) : "");
  const [localCurrency, setLocalCurrency] = useState(size.currency || "EUR");

  const soldCount = editions.filter((e) => e.status === "sold" && !e.is_ap).length;
  const apSoldCount = editions.filter((e) => e.status === "sold" && e.is_ap).length;
  const dimLabel = [size.height, size.width].filter(Boolean).join(" × ");

  const editionsChanged =
    localEditionCount !== String(size.edition_count) ||
    localApCount !== String(size.artist_proofs);

  const handleSaveDimensions = () => {
    onUpdateSize(size.id, {
      height: localHeight ? parseFloat(localHeight) : null,
      width: localWidth ? parseFloat(localWidth) : null,
      price: localPrice ? parseFloat(localPrice) : null,
      currency: localCurrency,
    });
    toast.success("Size details saved");
  };

  return (
    <div className="border border-border rounded-sm">
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left">
            {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
            <Badge variant="outline" className="font-mono text-xs">
              Size {size.size_label}
            </Badge>
            {dimLabel && (
              <span className="text-sm text-muted-foreground">{dimLabel} cm</span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {size.edition_count} ed. + {size.artist_proofs} AP
              {soldCount > 0 && <span className="ml-2 text-primary">({soldCount} sold)</span>}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-4">
            <Separator />

            {/* Size details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Height (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={localHeight}
                  onChange={(e) => setLocalHeight(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Width (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={localWidth}
                  onChange={(e) => setLocalWidth(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={localPrice}
                  onChange={(e) => setLocalPrice(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Select value={localCurrency} onValueChange={setLocalCurrency}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label className="text-xs">Editions</Label>
                <Input
                  type="number"
                  min="1"
                  value={localEditionCount}
                  onChange={(e) => setLocalEditionCount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Artist Proofs</Label>
                <Select value={localApCount} onValueChange={setLocalApCount}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="0" /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} AP</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveDimensions}
                className="gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save Details
              </Button>
              {editionsChanged && (
                <Button
                  size="sm"
                  onClick={() =>
                    onSaveEditions(
                      size,
                      parseInt(localEditionCount) || 1,
                      parseInt(localApCount) || 0
                    )
                  }
                  className="gap-1.5"
                >
                  Update Editions
                </Button>
              )}
            </div>

            <Separator />

            {/* Edition items list */}
            <div>
              <Label className="text-xs mb-2 block">Individual Editions</Label>
              <div className="space-y-1">
                {editions.map((item) => (
                  <EditionRow
                    key={item.id}
                    item={item}
                    gawid={formatGawid(globalArtworkId, size.size_label, item.edition_label)}
                    onUpdate={onUpdateEdition}
                    saving={savingEdition === item.id}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive gap-1.5"
                onClick={() => onDeleteSize(size.id)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Size {size.size_label}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

interface EditionRowProps {
  item: EditionItem;
  gawid: string;
  onUpdate: (item: EditionItem, updates: Partial<EditionItem>) => void;
  saving: boolean;
}

const EditionRow = ({ item, gawid, onUpdate, saving }: EditionRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const [localBuyer, setLocalBuyer] = useState(item.buyer_name || "");
  const [localLocation, setLocalLocation] = useState(item.artwork_location || "");
  const [localProvenance, setLocalProvenance] = useState(item.provenance || "");

  return (
    <div className="border border-border rounded-sm">
      <button
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-mono text-xs text-muted-foreground w-48 truncate">{gawid}</span>
        {item.is_ap && <Badge variant="secondary" className="text-[10px]">AP</Badge>}
        <Badge
          variant={item.status === "sold" ? "secondary" : "default"}
          className="text-[10px] ml-auto"
        >
          {item.status === "sold" ? "Sold" : "Available"}
        </Badge>
        {item.buyer_name && (
          <span className="text-xs text-muted-foreground truncate max-w-24">{item.buyer_name}</span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={item.status}
                onValueChange={(val) => {
                  const updates: Partial<EditionItem> = { status: val };
                  if (val === "available") {
                    updates.buyer_name = null;
                    updates.sold_date = null;
                    setLocalBuyer("");
                  }
                  onUpdate(item, updates);
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input
                value={localLocation}
                onChange={(e) => setLocalLocation(e.target.value)}
                onBlur={() => {
                  if (localLocation !== (item.artwork_location || "")) {
                    onUpdate(item, { artwork_location: localLocation || null });
                  }
                }}
                className="mt-1"
                placeholder="e.g. Studio"
              />
            </div>
          </div>

          {item.status === "sold" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Buyer</Label>
                <Input
                  value={localBuyer}
                  onChange={(e) => setLocalBuyer(e.target.value)}
                  onBlur={() => {
                    if (localBuyer !== (item.buyer_name || "")) {
                      onUpdate(item, { buyer_name: localBuyer || null });
                    }
                  }}
                  className="mt-1"
                  placeholder="Buyer name"
                />
              </div>
              <div>
                <Label className="text-xs">Sale Date</Label>
                <Input
                  type="date"
                  value={item.sold_date || ""}
                  onChange={(e) => onUpdate(item, { sold_date: e.target.value || null })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Provenance</Label>
            <Input
              value={localProvenance}
              onChange={(e) => setLocalProvenance(e.target.value)}
              onBlur={() => {
                if (localProvenance !== (item.provenance || "")) {
                  onUpdate(item, { provenance: localProvenance || null });
                }
              }}
              className="mt-1"
              placeholder="Ownership history"
            />
          </div>
        </div>
      )}
    </div>
  );
};
