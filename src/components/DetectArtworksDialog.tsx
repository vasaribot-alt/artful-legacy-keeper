import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  exhibition_image_id: string;
  artwork_id: string;
  confidence: number;
  reasoning: string | null;
  crop_x: number | null;
  crop_y: number | null;
  crop_width: number | null;
  crop_height: number | null;
  status: string;
  artwork: { id: string; title: string; year: number | null };
  artworkThumb: string | null;
  installationUrl: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exhibitionId: string | null;
  exhibitionTitle?: string;
  onApplied?: () => void;
}

const UNASSIGNED = "__unassigned__";

export const DetectArtworksDialog = ({ open, onOpenChange, exhibitionId, exhibitionTitle, onApplied }: Props) => {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [scanProgress, setScanProgress] = useState<{ processed: number; total: number } | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [savedMatchCount, setSavedMatchCount] = useState(0);
  const [scanSummary, setScanSummary] = useState<{ indexed: number; total: number; created: number; saved: number } | null>(null);
  const [seriesList, setSeriesList] = useState<{ value: string; label: string; count: number }[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !exhibitionId) return;
    void loadSuggestions();
    void loadSeries();
  }, [open, exhibitionId]);

  const loadSeries = async () => {
    if (!exhibitionId) return;
    try {
      const { data: ex } = await supabase
        .from("exhibitions")
        .select("user_id")
        .eq("id", exhibitionId)
        .maybeSingle();
      if (!ex) return;
      const { data: rows } = await supabase
        .from("artworks")
        .select("series")
        .eq("owner_id", ex.user_id);
      const counts = new Map<string, number>();
      for (const r of rows ?? []) {
        const key = r.series && r.series.trim() ? r.series.trim() : UNASSIGNED;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const list = Array.from(counts.entries())
        .map(([value, count]) => ({
          value,
          label: value === UNASSIGNED ? "Unassigned" : value,
          count,
        }))
        .sort((a, b) => {
          if (a.value === UNASSIGNED) return 1;
          if (b.value === UNASSIGNED) return -1;
          return a.label.localeCompare(b.label);
        });
      setSeriesList(list);
      setSelectedSeries(new Set(list.map((s) => s.value)));
    } catch (e) {
      console.warn("load series failed", e);
    }
  };

  const toggleSeries = (value: string) => {
    setSelectedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const allSelected = seriesList.length > 0 && selectedSeries.size === seriesList.length;
  const toggleAll = () => {
    if (allSelected) setSelectedSeries(new Set());
    else setSelectedSeries(new Set(seriesList.map((s) => s.value)));
  };

  const scopedCount = seriesList
    .filter((s) => selectedSeries.has(s.value))
    .reduce((sum, s) => sum + s.count, 0);

  const loadSuggestions = async () => {
    if (!exhibitionId) return;
    setLoading(true);
    try {
      const [
        { data, error },
        { count: savedCount, error: savedCountError },
      ] = await Promise.all([
        supabase
          .from("artwork_match_suggestions")
          .select("id, exhibition_image_id, artwork_id, confidence, reasoning, crop_x, crop_y, crop_width, crop_height, status, artworks!inner(id, title, year)")
          .eq("exhibition_id", exhibitionId)
          .eq("status", "pending")
          .order("confidence", { ascending: false }),
        supabase
          .from("artwork_match_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("exhibition_id", exhibitionId)
          .in("status", ["pending", "approved"]),
      ]);

      if (error) throw error;
      if (savedCountError) throw savedCountError;
      setSavedMatchCount(savedCount ?? 0);

      const exImgIds = [...new Set((data || []).map((s: any) => s.exhibition_image_id))];
      const artIds = [...new Set((data || []).map((s: any) => s.artwork_id))];

      const [{ data: exImgs }, { data: artImgs }] = await Promise.all([
        supabase.from("exhibition_images").select("id, storage_path, web_storage_path").in("id", exImgIds),
        supabase.from("artwork_images").select("artwork_id, storage_path, web_storage_path, display_order").in("artwork_id", artIds).order("display_order"),
      ]);

      const exUrlMap = new Map<string, string>();
      for (const im of exImgs ?? []) {
        const path = im.web_storage_path || im.storage_path;
        const bucket = im.web_storage_path ? "exhibition-images-web" : "exhibition-images";
        exUrlMap.set(im.id, supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
      }
      const artThumbMap = new Map<string, string>();
      for (const im of artImgs ?? []) {
        if (artThumbMap.has(im.artwork_id)) continue;
        const path = im.web_storage_path || im.storage_path;
        const bucket = im.web_storage_path ? "artwork-images-web" : "artwork-images";
        artThumbMap.set(im.artwork_id, supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
      }

      const enriched: Suggestion[] = (data || []).map((s: any) => ({
        ...s,
        artwork: s.artworks,
        artworkThumb: artThumbMap.get(s.artwork_id) || null,
        installationUrl: exUrlMap.get(s.exhibition_image_id) || "",
      }));
      setSuggestions(enriched);
    } catch (e: any) {
      toast.error(e.message || "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  const runDetection = async () => {
    if (!exhibitionId) return;
    if (seriesList.length > 0 && selectedSeries.size === 0) {
      toast.error("Select at least one series to scan.");
      return;
    }
    setRunning(true);
    setScanProgress(null);
    setScanMessage(null);
    setScanSummary(null);
    try {
      let offset = 0;
      let totalCreated = 0;
      let iterations = 0;
      let fallbackTriggered = false;
      let lastIndexedCatalogueSize = 0;
      let lastTotalCatalogueSize = 0;

      const seriesPayload = allSelected ? null : Array.from(selectedSeries);

      while (iterations < 100) {
        iterations += 1;

        const { data, error } = await supabase.functions.invoke("detect-artworks", {
          body: {
            exhibition_id: exhibitionId,
            offset,
            batch_size: 1,
            series: seriesPayload,
          },
        });

        if (error) throw error;

        if ((data as any)?.fallback) {
          const message = (data as any)?.error || "Detection stopped because AI is temporarily unavailable.";
          fallbackTriggered = true;
          setScanMessage(message);
          toast.error(message);
          break;
        }

        if ((data as any)?.error) throw new Error((data as any).error);

        const processed = Number((data as any)?.images_processed_until ?? 0);
        const total = Number((data as any)?.images_total ?? processed);
        totalCreated += Number((data as any)?.suggestions_created ?? 0);
        lastIndexedCatalogueSize = Number((data as any)?.indexed_catalogue_artworks ?? (data as any)?.catalogue_size ?? lastIndexedCatalogueSize);
        lastTotalCatalogueSize = Number((data as any)?.total_catalogue_artworks ?? lastTotalCatalogueSize);
        setScanProgress({ processed, total });

        if (!(data as any)?.has_more) break;

        const nextOffset = Number((data as any)?.next_offset ?? processed);
        if (!Number.isFinite(nextOffset) || nextOffset <= offset) break;
        offset = nextOffset;
      }

      if (!fallbackTriggered) {
        const { count: savedCount, error: savedCountError } = await supabase
          .from("artwork_match_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("exhibition_id", exhibitionId)
          .in("status", ["pending", "approved"]);

        if (savedCountError) throw savedCountError;

        const totalSaved = savedCount ?? 0;
        setSavedMatchCount(totalSaved);
        setScanSummary({
          indexed: lastIndexedCatalogueSize,
          total: lastTotalCatalogueSize || lastIndexedCatalogueSize,
          created: totalCreated,
          saved: totalSaved,
        });
        toast.success(
          totalCreated > 0
            ? `Found ${totalCreated} potential match${totalCreated === 1 ? "" : "es"}.`
            : totalSaved > 0
              ? `No new matches detected. ${totalSaved} saved match${totalSaved === 1 ? " is" : "es are"} already on this exhibition.`
              : "No matches detected.",
        );
      }
      await loadSuggestions();
    } catch (e: any) {
      toast.error(e.message || "Detection failed");
    } finally {
      setRunning(false);
      setScanProgress(null);
    }
  };

  const approve = async (s: Suggestion) => {
    if (!exhibitionId) return;
    try {
      const { error: linkErr } = await supabase
        .from("exhibition_artworks")
        .insert({ exhibition_id: exhibitionId, artwork_id: s.artwork_id });
      if (linkErr && !linkErr.message.includes("duplicate")) throw linkErr;

      await supabase
        .from("artwork_match_suggestions")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", s.id);

      setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
      toast.success("Linked to exhibition");
      onApplied?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    }
  };

  const reject = async (s: Suggestion) => {
    try {
      await supabase
        .from("artwork_match_suggestions")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", s.id);
      setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e: any) {
      toast.error(e.message || "Failed to reject");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Detect artworks in installation views
          </DialogTitle>
          <DialogDescription>
            {exhibitionTitle ? <>Compare installation photos in <em>{exhibitionTitle}</em> against your catalogue.</> : "AI compares installation photos against your catalogue."} Approved matches are linked to the exhibition.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 pt-2">
          {/* Step 1 — Series filter */}
          <div className="border-r border-border pr-4">
            <h3 className="text-sm font-semibold mb-1">Step 1</h3>
            <p className="text-xs text-muted-foreground mb-3">Choose series to look for works</p>

            {seriesList.length === 0 ? (
              <p className="text-xs text-muted-foreground">No series found in catalogue.</p>
            ) : (
              <>
                <label className="flex items-center gap-2 py-1.5 cursor-pointer text-sm font-medium">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                  />
                  <span>Select all</span>
                </label>
                <div className="border-t border-border my-2" />
                <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                  {seriesList.map((s) => (
                    <label
                      key={s.value}
                      className="flex items-center gap-2 py-1 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={selectedSeries.has(s.value)}
                        onCheckedChange={() => toggleSeries(s.value)}
                      />
                      <span className="flex-1 truncate">{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.count}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Step 2 — Detection */}
          <div>
            <h3 className="text-sm font-semibold mb-1">Step 2</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {seriesList.length > 0 && (
                <>Detection will search {scopedCount} artwork{scopedCount === 1 ? "" : "s"} across {selectedSeries.size} series.</>
              )}
            </p>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={runDetection} disabled={running || (seriesList.length > 0 && selectedSeries.size === 0)}>
                {running ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
                {running ? "Scanning..." : "Run detection"}
              </Button>
              {running && scanProgress && (
                <span className="text-xs text-muted-foreground">
                  {Math.min(scanProgress.processed, scanProgress.total)} / {scanProgress.total} views scanned
                </span>
              )}
              {suggestions.length > 0 && (
                <span className="text-xs text-muted-foreground">{suggestions.length} pending</span>
              )}
            </div>

            {scanMessage && (
              <p className="text-sm text-muted-foreground pt-2">{scanMessage}</p>
            )}

            {!running && scanSummary && (
              <p className="text-sm text-muted-foreground pt-2">
                {scanSummary.indexed < scanSummary.total
                  ? `Detection searched ${scanSummary.indexed} of ${scanSummary.total} catalogued artworks so far.`
                  : "Detection searched the full scoped catalogue."}{scanSummary.created === 0
                  ? scanSummary.saved > 0
                    ? ` No new pending matches were added. ${scanSummary.saved} saved match${scanSummary.saved === 1 ? " remains" : "es remain"} on this exhibition.`
                    : " No new pending matches were added."
                  : ""}
              </p>
            )}

            <div className="space-y-3 pt-3">
              {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!loading && running && scanProgress && suggestions.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Scanning installation views and preparing suggestions…
                </p>
              )}
              {!loading && suggestions.length === 0 && !running && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {savedMatchCount > 0
                    ? `No pending suggestions. ${savedMatchCount} saved match${savedMatchCount === 1 ? " is" : "es are"} already on this exhibition.`
                    : "No pending suggestions. Run detection to scan installation views."}
                </p>
              )}
              {suggestions.map((s) => {
                const hasCrop =
                  s.crop_x !== null && s.crop_y !== null && s.crop_width !== null && s.crop_height !== null;
                const cropStyle = hasCrop
                  ? {
                      outline: "2px solid hsl(var(--primary))",
                      position: "absolute" as const,
                      left: `${(s.crop_x ?? 0) * 100}%`,
                      top: `${(s.crop_y ?? 0) * 100}%`,
                      width: `${(s.crop_width ?? 0) * 100}%`,
                      height: `${(s.crop_height ?? 0) * 100}%`,
                      pointerEvents: "none" as const,
                    }
                  : null;

                return (
                  <div key={s.id} className="border border-border rounded-sm p-3 flex gap-3">
                    <div className="relative w-40 h-28 bg-secondary rounded-sm overflow-hidden shrink-0">
                      {s.installationUrl && (
                        <img src={s.installationUrl} alt="" className="w-full h-full object-cover" />
                      )}
                      {cropStyle && <div style={cropStyle} />}
                    </div>

                    <div className="w-20 h-28 bg-secondary rounded-sm overflow-hidden shrink-0">
                      {s.artworkThumb && (
                        <img src={s.artworkThumb} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {s.artwork.title}
                            {s.artwork.year ? <span className="text-muted-foreground"> · {s.artwork.year}</span> : null}
                          </p>
                          <Badge variant="secondary" className="mt-1 font-normal text-[10px]">
                            {Math.round(s.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => reject(s)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="default" className="h-7 w-7" onClick={() => approve(s)}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      {s.reasoning && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{s.reasoning}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
