import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Link as LinkIcon, ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PortfolioArtwork {
  id: string;
  artwork_id: string;
  title: string;
  year: number | null;
  medium: string | null;
  imageUrl: string | null;
}

interface AvailableArtwork {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
  series: string | null;
  imageUrl: string | null;
}

const PortfolioDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [portfolioName, setPortfolioName] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [artworks, setArtworks] = useState<PortfolioArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [available, setAvailable] = useState<AvailableArtwork[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSeries, setPickerSeries] = useState<string>("all");

  useEffect(() => {
    if (!id) return;
    fetchPortfolio();
  }, [id]);

  const fetchPortfolio = async () => {
    setLoading(true);
    const { data: pData } = await supabase
      .from("portfolios")
      .select("name, share_token")
      .eq("id", id!)
      .single();
    if (pData) {
      setPortfolioName((pData as any).name);
      setShareToken((pData as any).share_token);
    }

    const { data: paData } = await supabase
      .from("portfolio_artworks")
      .select("id, artwork_id")
      .eq("portfolio_id", id!)
      .order("display_order");

    if (paData && paData.length > 0) {
      const artworkIds = paData.map((pa) => pa.artwork_id);
      const { data: artData } = await supabase
        .from("artworks")
        .select("id, title, year, medium")
        .in("id", artworkIds);

      const enriched: PortfolioArtwork[] = await Promise.all(
        paData.map(async (pa) => {
          const art = artData?.find((a) => a.id === pa.artwork_id);
          const { data: imgs } = await supabase
            .from("artwork_images")
            .select("storage_path")
            .eq("artwork_id", pa.artwork_id)
            .order("display_order")
            .limit(1);
          let imageUrl: string | null = null;
          if (imgs && imgs.length > 0) {
            const { data: urlData } = supabase.storage
              .from("artwork-images")
              .getPublicUrl(imgs[0].storage_path);
            imageUrl = urlData.publicUrl;
          }
          return {
            id: pa.id,
            artwork_id: pa.artwork_id,
            title: art?.title || "Untitled",
            year: art?.year || null,
            medium: art?.medium || null,
            imageUrl,
          };
        })
      );
      setArtworks(enriched);
    } else {
      setArtworks([]);
    }
    setLoading(false);
  };

  const openPicker = async () => {
    const activeRole = localStorage.getItem("activeRole") || "artist";
    const { data } = await supabase
      .from("artworks")
      .select("id, title, year, medium, series")
      .eq("role_context", activeRole)
      .order("title");
    const existingIds = new Set(artworks.map((a) => a.artwork_id));
    const filtered = (data || []).filter((a) => !existingIds.has(a.id));

    // Fetch thumbnails in parallel
    const enriched: AvailableArtwork[] = await Promise.all(
      filtered.map(async (a: any) => {
        const { data: imgs } = await supabase
          .from("artwork_images")
          .select("storage_path")
          .eq("artwork_id", a.id)
          .order("display_order")
          .limit(1);
        let imageUrl: string | null = null;
        if (imgs && imgs.length > 0) {
          const { data: urlData } = supabase.storage
            .from("artwork-images")
            .getPublicUrl(imgs[0].storage_path);
          imageUrl = urlData.publicUrl;
        }
        return {
          id: a.id,
          title: a.title,
          year: a.year,
          medium: a.medium,
          series: a.series,
          imageUrl,
        };
      })
    );

    setAvailable(enriched);
    setSelected(new Set());
    setPickerSearch("");
    setPickerSeries("all");
    setPickerOpen(true);
  };

  const handleAddArtworks = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    const inserts = Array.from(selected).map((artwork_id, i) => ({
      portfolio_id: id!,
      artwork_id,
      display_order: artworks.length + i,
    }));
    const { error } = await supabase.from("portfolio_artworks").insert(inserts as any);
    if (error) toast.error("Failed to add artworks");
    else { toast.success(`${selected.size} work(s) added`); setPickerOpen(false); fetchPortfolio(); }
    setAdding(false);
  };

  const handleRemove = async (paId: string) => {
    const { error } = await supabase.from("portfolio_artworks").delete().eq("id", paId);
    if (error) toast.error("Failed to remove");
    else {
      setArtworks((prev) => prev.filter((a) => a.id !== paId));
      toast.success("Removed from portfolio");
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/portfolio/shared/${shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  };

  const toggleSelect = (artworkId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(artworkId)) next.delete(artworkId);
      else next.add(artworkId);
      return next;
    });
  };

  const headerActions = (
    <>
      <Button variant="outline" size="sm" onClick={copyShareLink} className="gap-1.5">
        <LinkIcon className="w-3.5 h-3.5" /> Share
      </Button>
      <Button size="sm" onClick={openPicker} className="gap-1.5">
        <Plus className="w-4 h-4" /> Add Works
      </Button>
    </>
  );

  return (
    <AppLayout title={portfolioName || "Portfolio"} headerActions={headerActions}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate("/portfolios")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All Portfolios
        </button>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-secondary animate-pulse rounded-sm" />
            ))}
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No works in this portfolio yet</p>
            <Button variant="outline" onClick={openPicker} className="gap-2">
              <Plus className="w-4 h-4" /> Add artworks
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {artworks.map((art) => (
              <div key={art.id} className="group relative">
                <div className="aspect-square bg-secondary rounded-sm overflow-hidden">
                  {art.imageUrl ? (
                    <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                  )}
                </div>
                <h3 className="text-xs font-medium italic mt-1.5 truncate">{art.title}</h3>
                {art.year && <p className="text-xs text-muted-foreground">{art.year}</p>}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(art.id)}
                  className="absolute top-1 right-1 h-7 w-7 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add works to portfolio</DialogTitle>
          </DialogHeader>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">All artworks are already in this portfolio.</p>
          ) : (
            <div className="space-y-1 mt-2">
              {available.map((art) => (
                <label
                  key={art.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-secondary/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(art.id)}
                    onCheckedChange={() => toggleSelect(art.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{art.title}</span>
                    <div className="flex gap-1.5 text-xs text-muted-foreground">
                      {art.year && <span>{art.year}</span>}
                      {art.year && art.medium && <span>·</span>}
                      {art.medium && <span className="truncate">{art.medium}</span>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddArtworks} disabled={selected.size === 0 || adding}>
              Add {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default PortfolioDetail;
