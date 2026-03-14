import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, CheckCircle, ShoppingBag, Filter, ArrowUpDown } from "lucide-react";

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

const formatDimensions = (h: number | null, w: number | null, d: number | null) => {
  const parts = [h, w, d].filter((v) => v != null);
  if (parts.length === 0) return null;
  return parts.join(" × ") + " cm";
};

const Inventory = () => {
  const navigate = useNavigate();
  const [artworks, setArtworks] = useState<ArtworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<"location" | "status">("location");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "sold">("all");
  const [sortBy, setSortBy] = useState<"title" | "year" | "date_added">("title");
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
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

  const filteredArtworks = statusFilter === "all"
    ? artworks
    : artworks.filter(a => (a.status || "available") === statusFilter);

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
      const order: Record<string, number> = { available: 0, sold: 1 };
      return (order[a] ?? 2) - (order[b] ?? 2);
    }
    if (a === "No location set") return 1;
    if (b === "No location set") return -1;
    return a.localeCompare(b);
  });

  const statusLabel = (s: string) => s === "sold" ? "Sold" : "Available";
  const statusColor = (s: string) => s === "sold" ? "secondary" : "default";

  const headerActions = (
    <div className="flex items-center gap-3">
      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <Filter className="w-3.5 h-3.5 mr-1.5" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="available">Available</SelectItem>
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
                      onClick={() => navigate(`/artwork/${art.id}`)}
                    >
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
                        {formatDimensions(art.height, art.width, art.depth) && (
                          <span className="text-xs text-muted-foreground">
                            {formatDimensions(art.height, art.width, art.depth)}
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
