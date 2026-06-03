import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

interface SeriesGroup {
  id: string;
  name: string;
  created_at: string;
}

interface SeriesArtwork {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  imageUrl: string | null;
}

const Series = () => {
  const navigate = useNavigate();
  const [series, setSeries] = useState<SeriesGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [seriesArtworks, setSeriesArtworks] = useState<Record<string, SeriesArtwork[]>>({});
  const [loadingArtworks, setLoadingArtworks] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      fetchSeries();
    };
    init();
  }, [navigate]);

  const fetchSeries = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("series_groups")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (error) toast.error("Failed to load series");
    else setSeries(data || []);
    setLoading(false);
  };

  const fetchArtworksForSeries = async (seriesName: string) => {
    if (seriesArtworks[seriesName]) return;
    setLoadingArtworks(seriesName);
    const { data, error } = await supabase
      .from("artworks")
      .select("id, title, year, medium, height, width, depth")
      .eq("series", seriesName)
      .order("year", { ascending: false });
    if (error) {
      toast.error("Failed to load artworks");
      setLoadingArtworks(null);
      return;
    }
    const withImages: SeriesArtwork[] = await Promise.all(
      (data || []).map(async (art) => {
        const { data: imgs } = await supabase
          .from("artwork_images")
          .select("storage_path")
          .eq("artwork_id", art.id)
          .order("display_order")
          .limit(1);
        let imageUrl: string | null = null;
        if (imgs && imgs.length > 0) {
          const { data: urlData } = supabase.storage
            .from("artwork-images")
            .getPublicUrl(imgs[0].storage_path);
          imageUrl = urlData.publicUrl;
        }
        return { ...art, imageUrl };
      })
    );
    setSeriesArtworks((prev) => ({ ...prev, [seriesName]: withImages }));
    setLoadingArtworks(null);
  };

  const toggleExpand = (seriesName: string) => {
    if (expandedSeries === seriesName) {
      setExpandedSeries(null);
    } else {
      setExpandedSeries(seriesName);
      fetchArtworksForSeries(seriesName);
    }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAdding(false); return; }

    const { error } = await supabase.from("series_groups").insert({ user_id: user.id, name });
    if (error) {
      if (error.code === "23505") toast.error("Series already exists");
      else toast.error("Failed to add series");
    } else {
      toast.success("Series added");
      setNewName("");
      fetchSeries();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from("series_groups").delete().eq("id", id);
    if (error) toast.error("Failed to delete series");
    else {
      toast.success(`"${name}" deleted`);
      setSeries((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const headerActions = editMode ? (
    <Button variant="outline" size="sm" onClick={() => setEditMode(false)} className="gap-1.5">
      <Eye className="w-4 h-4" /> Done
    </Button>
  ) : (
    <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
      <Pencil className="w-3.5 h-3.5" /> Edit
    </Button>
  );

  const renderArtworksList = (seriesName: string) => {
    if (loadingArtworks === seriesName) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 pt-4 pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[3/4] bg-secondary animate-pulse rounded-sm" />
              <div className="h-4 w-3/4 bg-secondary animate-pulse rounded-sm" />
              <div className="h-3 w-1/2 bg-secondary animate-pulse rounded-sm" />
            </div>
          ))}
        </div>
      );
    }
    const artworks = seriesArtworks[seriesName];
    if (!artworks || artworks.length === 0) {
      return (
        <p className="pt-4 pb-2 text-xs text-muted-foreground">No artworks in this series.</p>
      );
    }
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 pt-4 pb-2">
        {artworks.map((art) => (
          <div
            key={art.id}
            className="group cursor-pointer"
            onClick={() => navigate(`/artwork/${art.id}/view`)}
          >
            <div className="aspect-[3/4] bg-secondary rounded-sm overflow-hidden mb-2">
              {art.imageUrl ? (
                <img
                  src={art.imageUrl}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  No image
                </div>
              )}
            </div>
            <h4 className="text-sm font-medium italic truncate">{art.title}</h4>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              {art.year && <span>{art.year}</span>}
              {art.year && art.medium && <span>·</span>}
              {art.medium && <span className="truncate">{art.medium}</span>}
            </div>
            {formatDims(art.height, art.width, art.depth) && (
              <p className="text-xs text-muted-foreground mt-0.5">{formatDims(art.height, art.width, art.depth)}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppLayout title="Series" headerActions={headerActions}>
      {editMode ? (
        <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
          <p className="text-sm text-muted-foreground">
            Manage the series and groups used to organize your artworks. These appear as options when registering new works.
          </p>

          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New series name"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            />
            <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : series.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No series created yet.</p>
          ) : (
            <div className="space-y-1">
              {series.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-border hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-sm font-medium">{s.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(s.id, s.name)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* View mode – expandable series with artworks */
        <div className="max-w-5xl mx-auto px-6 py-10">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 w-48 bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : series.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No series yet.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditMode(true)}>
                Add series
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {series.map((s) => (
                <div key={s.id}>
                  <button
                    onClick={() => toggleExpand(s.name)}
                    className="w-full flex items-center gap-2 px-3 py-3 rounded-sm hover:bg-secondary/50 transition-colors text-left"
                  >
                    {expandedSeries === s.name ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-medium">{s.name}</span>
                    {seriesArtworks[s.name] && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {seriesArtworks[s.name].length} work{seriesArtworks[s.name].length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </button>
                  {expandedSeries === s.name && renderArtworksList(s.name)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default Series;
