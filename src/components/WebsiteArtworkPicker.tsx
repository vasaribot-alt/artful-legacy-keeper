import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ImageOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface WebsiteArtworkOption {
  id: string;
  title: string;
  year: number | null;
  series: string | null;
  imageUrl: string | null;
}

interface WebsiteArtworkPickerProps {
  artworks: WebsiteArtworkOption[];
  mode?: "multiple" | "single";
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  emptyText?: string;
}

const ArtworkRow = ({
  artwork,
  checked,
  mode,
  onChange,
}: {
  artwork: WebsiteArtworkOption;
  checked: boolean;
  mode: "multiple" | "single";
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-2 transition-colors hover:bg-accent/50">
    <div className="h-16 w-14 shrink-0 overflow-hidden rounded-sm bg-muted">
      {artwork.imageUrl ? (
        <img src={artwork.imageUrl} alt={artwork.title} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <ImageOff className="h-4 w-4" />
        </div>
      )}
    </div>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium">{artwork.title}</span>
      <span className="block truncate text-xs text-muted-foreground">
        {[artwork.year, artwork.series].filter(Boolean).join(" · ") || "No year or series"}
      </span>
    </span>
    {mode === "single" ? (
      <RadioGroupItem value={artwork.id} aria-label={`Select ${artwork.title}`} />
    ) : (
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} aria-label={`Show ${artwork.title}`} />
    )}
  </label>
);

export const WebsiteArtworkPicker = ({
  artworks,
  mode = "multiple",
  selectedIds,
  onSelectionChange,
  emptyText = "No works registered yet.",
}: WebsiteArtworkPickerProps) => {
  const [openSeries, setOpenSeries] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(selectedIds.size > 0);
  const groups = useMemo(() => {
    const grouped = new Map<string, WebsiteArtworkOption[]>();
    artworks.forEach((artwork) => {
      const name = artwork.series?.trim() || "Other works";
      grouped.set(name, [...(grouped.get(name) || []), artwork]);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => {
      if (a === "Other works") return 1;
      if (b === "Other works") return -1;
      return a.localeCompare(b);
    });
  }, [artworks]);

  const setOne = (id: string) => {
    onSelectionChange(new Set(id ? [id] : []));
    if (id) setCollapsed(true);
  };
  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    onSelectionChange(next);
  };

  const list = (items: WebsiteArtworkOption[]) => (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((artwork) => (
        <ArtworkRow
          key={artwork.id}
          artwork={artwork}
          checked={selectedIds.has(artwork.id)}
          mode={mode}
          onChange={(checked) => toggle(artwork.id, checked)}
        />
      ))}
    </div>
  );

  if (artworks.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;

  const content = (
    <Tabs defaultValue="all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="all">All works</TabsTrigger>
          <TabsTrigger value="series">By series</TabsTrigger>
        </TabsList>
        {mode === "multiple" && (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onSelectionChange(new Set(artworks.map((artwork) => artwork.id)))}>Select all</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onSelectionChange(new Set())}>Clear</Button>
          </div>
        )}
      </div>
      <TabsContent value="all" className="mt-4 max-h-[32rem] overflow-y-auto pr-2">{list(artworks)}</TabsContent>
      <TabsContent value="series" className="mt-4 space-y-2">
        {groups.map(([name, items]) => {
          const isOpen = openSeries.has(name);
          const selectedCount = items.filter((item) => selectedIds.has(item.id)).length;
          return (
            <Collapsible
              key={name}
              open={isOpen}
              onOpenChange={(open) => {
                const next = new Set(openSeries);
                if (open) next.add(name); else next.delete(name);
                setOpenSeries(next);
              }}
            >
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="h-auto w-full justify-start gap-2 px-3 py-3">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-medium">{name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {mode === "multiple" ? `${selectedCount} of ${items.length}` : `${items.length} work${items.length === 1 ? "" : "s"}`}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pb-3 pl-3">{list(items)}</CollapsibleContent>
            </Collapsible>
          );
        })}
      </TabsContent>
    </Tabs>
  );

  const chosen = artworks.filter((artwork) => selectedIds.has(artwork.id));
  const summary =
    mode === "single"
      ? chosen[0]
        ? `${chosen[0].title}${chosen[0].year ? ` · ${chosen[0].year}` : ""}`
        : "No work chosen yet"
      : `${chosen.length} of ${artworks.length} work${artworks.length === 1 ? "" : "s"} chosen`;

  if (collapsed) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 gap-1">
            {chosen.slice(0, 4).map((artwork) => (
              <div key={artwork.id} className="h-12 w-10 overflow-hidden rounded-sm bg-muted">
                {artwork.imageUrl ? (
                  <img src={artwork.imageUrl} alt={artwork.title} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageOff className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <span className="min-w-0 truncate text-sm">{summary}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setCollapsed(false)}>Change</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mode === "single" ? (
        <RadioGroup value={Array.from(selectedIds)[0] || ""} onValueChange={setOne}>{content}</RadioGroup>
      ) : content}
      <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">{summary}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setCollapsed(true)}>Done</Button>
      </div>
    </div>
  );
};