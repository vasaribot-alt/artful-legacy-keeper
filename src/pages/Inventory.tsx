import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, CheckCircle, ShoppingBag, Filter, ArrowUpDown, Search, Download, CheckSquare, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { exportArtworksToArtlogic } from "@/lib/artlogicExport";
import { exportInsuranceSchedule } from "@/lib/insuranceExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ArtworkRow {
  id: string;
  title: string;
  artwork_type: string | null;
  medium: string | null;
  year: number | null;
  artwork_location: string | null;
  status: string;
  height: number | null;
  width: number | null;
  depth: number | null;
  created_at: string;
}

import { useUnitPreference } from "@/hooks/useUnitPreference";

const Inventory = () => {
  const navigate = useNavigate();
  const { formatDims } = useUnitPreference();
  const [artworks, setArtworks] = useState<ArtworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<"location" | "status">("location");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "considering" | "sold">("all");
  const [sortBy, setSortBy] = useState<"title" | "year" | "date_added">("title");
  const [searchQuery, setSearchQuery] = useState("");
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const activeRole = localStorage.getItem("activeRole") || "artist";

  useEffect(() => {
    fetchArtworks();
  }, []);

  const fetchArtworks = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const { data } = await supabase
      .from("artworks")
      .select("id, title, artwork_type, medium, year, artwork_location, status, height, width, depth, created_at")
      .eq("owner_id", user.id)
      .eq("role_context", activeRole)
      .order("title");

    if (data) {
      setArtworks(data as any);
      // Fetch thumbnails
      const thumbMap: Record<string, string> = {};
      await Promise.all(
        data.map(async (art: any) => {
          const { data: imgs } = await supabase
            .from("artwork_images")
            .select("storage_path")
            .eq("artwork_id", art.id)
            .order("display_order")
            .limit(1);
          if (imgs && imgs.length > 0) {
            const { data: urlData } = supabase.storage
              .from("artwork-images")
              .getPublicUrl(imgs[0].storage_path);
            thumbMap[art.id] = urlData.publicUrl;
          }
        })
      );
      setThumbnails(thumbMap);
    }
    setLoading(false);
  };

  const searchLower = searchQuery.toLowerCase().trim();
  const filteredArtworks = (statusFilter === "all"
    ? artworks
    : artworks.filter(a => (a.status || "available") === statusFilter)
  ).filter(a => {
    if (!searchLower) return true;
    return (a.title || "").toLowerCase().includes(searchLower)
      || (a.medium || "").toLowerCase().includes(searchLower)
      || (a.artwork_location || "").toLowerCase().includes(searchLower);
  }).sort((a, b) => {
    if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
    if (sortBy === "year") return (b.year || 0) - (a.year || 0);
    if (sortBy === "date_added") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return 0;
  });

  const grouped = filteredArtworks.reduce<Record<string, ArtworkRow[]>>((acc, art) => {
    const key = groupBy === "location"
      ? (art.artwork_location || "No location set")
      : (art.status || "available");
    if (!acc[key]) acc[key] = [];
    acc[key].push(art);
    return acc;
  }, {});

  // Sort groups
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (groupBy === "status") {
      const order: Record<string, number> = { available: 0, considering: 1, sold: 2 };
      return (order[a] ?? 3) - (order[b] ?? 3);
    }
    if (a === "No location set") return 1;
    if (b === "No location set") return -1;
    return a.localeCompare(b);
  });

  const statusLabel = (s: string) =>
    s === "sold" ? "Sold" : s === "considering" ? "Considering sale" : "Available";
  const statusColor = (s: string) =>
    s === "sold" ? "secondary" : s === "considering" ? "outline" : "default";

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExport = async (scope: "selected" | "all") => {
    const ids = scope === "all"
      ? filteredArtworks.map((a) => a.id)
      : Array.from(selected);
    if (ids.length === 0) {
      toast.error("Select at least one artwork");
      return;
    }
    setExporting(true);
    try {
      const { count, filename } = await exportArtworksToArtlogic({
        artworkIds: ids,
        filenameBase: `inventory_${activeRole}`,
      });
      toast.success(`Exported ${count} artwork${count === 1 ? "" : "s"} to ${filename}`);
      if (scope === "selected") {
        setSelected(new Set());
        setSelectMode(false);
      }
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      {selectMode ? (
        <>
          <span className="text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <Button
            size="sm"
            variant="default"
            onClick={() => handleExport("selected")}
            disabled={exporting || selected.size === 0}
            className="gap-1.5 h-8"
          >
            <Download className="w-3.5 h-3.5" /> Export selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setSelectMode(false); setSelected(new Set()); }}
            className="gap-1.5 h-8"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </Button>
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectMode(true)}
            className="gap-1.5 h-8"
          >
            <CheckSquare className="w-3.5 h-3.5" /> Select
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExport("all")}
            disabled={exporting || filteredArtworks.length === 0}
            className="gap-1.5 h-8"
          >
            <Download className="w-3.5 h-3.5" /> Export to gallery
          </Button>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Sort by title</SelectItem>
              <SelectItem value="year">Sort by year</SelectItem>
              <SelectItem value="date_added">Date added</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="considering">Considering sale</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
          <ToggleGroup type="single" value={groupBy} onValueChange={(v) => v && setGroupBy(v as any)} size="sm">
            <ToggleGroupItem value="location" aria-label="Group by location" className="gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Location
            </ToggleGroupItem>
            <ToggleGroupItem value="status" aria-label="Group by status" className="gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Status
            </ToggleGroupItem>
          </ToggleGroup>
        </>
      )}
    </div>
  );

  return (
    <AppLayout title="Inventory" headerActions={headerActions}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-secondary animate-pulse rounded-sm" />
            ))}
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No artworks yet</p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Go to artworks
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, medium, or location…"
                className="pl-9"
              />
            </div>

            {/* Summary */}
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{artworks.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Available:</span>
                <span className="font-medium">{artworks.filter(a => (a.status || "available") === "available").length}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Sold:</span>
                <span className="font-medium">{artworks.filter(a => a.status === "sold").length}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Locations:</span>
                <span className="font-medium">
                  {new Set(artworks.map(a => a.artwork_location).filter(Boolean)).size}
                </span>
              </div>
            </div>

            {/* Grouped list */}
            {sortedKeys.map((key) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  {groupBy === "location" ? (
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  ) : null}
                  <h2 className="text-sm font-semibold uppercase tracking-wider">
                    {groupBy === "status" ? statusLabel(key) : key}
                  </h2>
                  <span className="text-xs text-muted-foreground">({grouped[key].length})</span>
                </div>
                <div className="space-y-1">
                  {grouped[key].map((art) => (
                    <div
                      key={art.id}
                      className="flex items-center gap-4 p-3 rounded-sm border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => selectMode ? toggleSelect(art.id) : navigate(`/artwork/${art.id}`)}
                    >
                      {selectMode && (
                        <Checkbox
                          checked={selected.has(art.id)}
                          onCheckedChange={() => toggleSelect(art.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div className="w-12 h-12 bg-secondary rounded-sm overflow-hidden shrink-0">
                        {thumbnails[art.id] ? (
                          <img src={thumbnails[art.id]} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[8px]">
                            No img
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{art.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {art.year && <span>{art.year}</span>}
                          {art.medium && <><span>·</span><span className="truncate">{art.medium}</span></>}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        {formatDims(art.height, art.width, art.depth) && (
                          <span className="text-xs text-muted-foreground">
                            {formatDims(art.height, art.width, art.depth)}
                          </span>
                        )}
                        {groupBy === "location" && (
                          <Badge variant={statusColor(art.status || "available")} className="text-[10px]">
                            {statusLabel(art.status || "available")}
                          </Badge>
                        )}
                        {groupBy === "status" && art.artwork_location && (
                          <span className="text-xs text-muted-foreground">📍 {art.artwork_location}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Inventory;
