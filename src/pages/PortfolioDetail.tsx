import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Link as LinkIcon, ArrowLeft, Search, Pencil } from "lucide-react";
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
  const [portfolioRole, setPortfolioRole] = useState<string>("artist");
  const [shareToken, setShareToken] = useState("");
  const [artworks, setArtworks] = useState<PortfolioArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [available, setAvailable] = useState<AvailableArtwork[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSeries, setPickerSeries] = useState<string>("all");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchPortfolio();
  }, [id]);

  const fetchPortfolio = async () => {
    setLoading(true);
    const { data: pData } = await supabase
      .from("portfolios")
      .select("name, share_token, role_context")
      .eq("id", id!)
      .single();
    if (pData) {
      setPortfolioName((pData as any).name);
      setShareToken((pData as any).share_token);
      setPortfolioRole((pData as any).role_context || "artist");
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
    const { data } = await supabase
      .from("artworks")
      .select("id, title, year, medium, series")
      .eq("role_context", portfolioRole)
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

  const openRename = () => {
    setRenameValue(portfolioName);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    const next = renameValue.trim();
    if (!next || next === portfolioName) { setRenameOpen(false); return; }
    setRenaming(true);
    const { error } = await supabase
      .from("portfolios")
      .update({ name: next })
      .eq("id", id!);
    setRenaming(false);
    if (error) {
      toast.error("Failed to rename portfolio");
    } else {
      setPortfolioName(next);
      setRenameOpen(false);
      toast.success("Portfolio renamed");
    }
  };

  const headerActions = (
    <>
      <Button variant="outline" size="sm" onClick={openRename} className="gap-1.5">
        <Pencil className="w-3.5 h-3.5" /> Rename
      </Button>
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
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add works to portfolio</DialogTitle>
          </DialogHeader>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">All artworks are already in this portfolio.</p>
          ) : (() => {
            const seriesList = Array.from(
              new Set(available.map((a) => a.series).filter((s): s is string => !!s && s.trim().length > 0))
            ).sort((a, b) => a.localeCompare(b));

            const search = pickerSearch.toLowerCase().trim();
            const filtered = available.filter((a) => {
              if (pickerSeries === "all") {
                // show all
              } else if (pickerSeries === "__none__") {
                if (a.series && a.series.trim().length > 0) return false;
              } else if (a.series !== pickerSeries) {
                return false;
              }
              if (!search) return true;
              return (
                (a.title || "").toLowerCase().includes(search) ||
                (a.medium || "").toLowerCase().includes(search) ||
                (a.series || "").toLowerCase().includes(search) ||
                (a.year ? String(a.year) : "").includes(search)
              );
            });

            const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));
            const toggleAll = () => {
              setSelected((prev) => {
                const next = new Set(prev);
                if (allSelected) filtered.forEach((a) => next.delete(a.id));
                else filtered.forEach((a) => next.add(a.id));
                return next;
              });
            };

            return (
              <>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Search title, medium, year…"
                      className="pl-9 h-9"
                    />
                  </div>
                  <Select value={pickerSeries} onValueChange={setPickerSeries}>
                    <SelectTrigger className="sm:w-[200px] h-9">
                      <SelectValue placeholder="All series" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All series</SelectItem>
                      {seriesList.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                      <SelectItem value="__none__">No series</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between mt-3 px-1">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    disabled={filtered.length === 0}
                  >
                    {allSelected ? "Deselect all" : "Select all"} ({filtered.length})
                  </button>
                  <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                </div>

                <div className="flex-1 overflow-y-auto mt-2 -mx-1 px-1">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No matching artworks.</p>
                  ) : (
                    <div className="space-y-1">
                      {filtered.map((art) => (
                        <label
                          key={art.id}
                          className="flex items-center gap-3 px-2 py-2 rounded-sm hover:bg-secondary/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selected.has(art.id)}
                            onCheckedChange={() => toggleSelect(art.id)}
                          />
                          <div className="w-12 h-12 bg-secondary rounded-sm overflow-hidden shrink-0">
                            {art.imageUrl ? (
                              <img src={art.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[8px]">
                                No img
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{art.title}</div>
                            <div className="flex gap-1.5 text-xs text-muted-foreground">
                              {art.year && <span>{art.year}</span>}
                              {art.year && art.medium && <span>·</span>}
                              {art.medium && <span className="truncate">{art.medium}</span>}
                            </div>
                            {art.series && (
                              <div className="text-[11px] text-muted-foreground/80 truncate italic">{art.series}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
          <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
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
