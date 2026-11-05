import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, ArrowUp, ArrowDown, Eye, Download, Loader2 } from "lucide-react";
import { SketchbookReader } from "@/components/SketchbookReader";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { deliverArtworkExport } from "@/lib/artistArtworkExport";
import { movePage } from "@/lib/sketchbookPdf";
import { createExhibitionCatalogue, type CatalogueLayout, type CatalogueWork } from "@/lib/exhibitionCataloguePdf";
import { toast } from "sonner";

interface Exhibition {
  id: string; title: string; venue: string | null; city: string | null; country: string | null;
  opening_date: string | null; closing_date: string | null; curator: string | null;
  exhibition_text?: string | null;
}

export function ExhibitionCatalogue({ exhibition, ownerId }: { exhibition: Exhibition; ownerId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(exhibition.title);
  const [artist, setArtist] = useState("");
  const [introduction, setIntroduction] = useState(exhibition.exhibition_text || "");
  const [credits, setCredits] = useState(exhibition.curator ? `Curator: ${exhibition.curator}` : "");
  const [layout, setLayout] = useState<CatalogueLayout>("single");
  const [works, setWorks] = useState<CatalogueWork[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [prepared, setPrepared] = useState<{ blob: Blob; url: string; title: string; warnings: string[] } | null>(null);
  const [error, setError] = useState("");
  const { formatDims } = useUnitPreference();
  useEffect(() => () => { if (prepared) URL.revokeObjectURL(prepared.url); }, [prepared]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true); setError(""); setPrepared(null);
    void (async () => {
      try {
        const [ex, profile, links] = await Promise.all([
          supabase.from("exhibitions").select("id").eq("id", exhibition.id).eq("user_id", ownerId).single(),
          supabase.from("profiles").select("full_name").eq("user_id", ownerId).maybeSingle(),
          supabase.from("exhibition_artworks").select("artwork_id").eq("exhibition_id", exhibition.id).order("created_at").order("id"),
        ]);
        if (ex.error) throw ex.error;
        if (profile.error) throw profile.error;
        if (links.error) throw links.error;
        const ids = (links.data || []).map(link => link.artwork_id);
        const results: CatalogueWork[] = [];
        for (let start = 0; start < ids.length; start += 100) {
          const { data, error: loadError } = await supabase.from("artworks")
            .select("id, title, artist_name, year, medium, support, height, width, depth, dimensions, global_artwork_id, image_url, artwork_images(storage_path, web_storage_path, display_order)")
            .eq("owner_id", ownerId).eq("role_context", "artist").in("id", ids.slice(start, start + 100));
          if (loadError) throw loadError;
          for (const work of data || []) {
            const image = [...work.artwork_images].sort((a, b) => a.display_order - b.display_order)[0];
            const path = image?.web_storage_path || image?.storage_path || work.image_url;
            const bucket = image?.web_storage_path ? "artwork-images-web" : "artwork-images";
            const imageUrl = !path ? null : /^https?:\/\//i.test(path) ? path : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
            results.push({ id: work.id, title: work.title || "Untitled", imageUrl,
              caption: [work.artist_name || profile.data?.full_name, work.year, [work.medium, work.support].filter(Boolean).join(" on "), formatDims(work.height, work.width, work.depth) || work.dimensions,
                `GAWID-${String(work.global_artwork_id).padStart(8, "0")}`].filter(value => value !== null && value !== undefined && value !== "").join("\n") });
          }
        }
        if (cancelled) return;
        results.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        setWorks(results); setSelected(results.map(work => work.id));
        setArtist(profile.data?.full_name || "");
      } catch { if (!cancelled) setError("Unable to load this exhibition’s artworks. Please try again."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, ownerId, exhibition.id, formatDims]);

  const invalidate = () => setPrepared(null);
  const prepare = async () => {
    setBusy(true); setError(""); setPrepared(null);
    try {
      const result = await createExhibitionCatalogue({ title, artist, introduction, credits, layout,
        details: [[exhibition.venue, exhibition.city, exhibition.country].filter(Boolean).join(", "),
          [exhibition.opening_date, exhibition.closing_date].filter(Boolean).join(" – ")].filter(Boolean).join("\n"),
        works: works.filter(work => selected.includes(work.id)) });
      setPrepared({ ...result, url: URL.createObjectURL(result.blob), title });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to prepare catalogue."); }
    finally { setBusy(false); }
  };
  return <>
    <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}><BookOpen className="h-4 w-4" />Catalogue PDF</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); if (!value) setPrepared(null); } }}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-5xl max-h-[94dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Exhibition catalogue</DialogTitle></DialogHeader>
        {loading ? <p role="status">Loading artworks…</p> : <div className="space-y-5">
          <fieldset disabled={busy} className="space-y-4 min-w-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="catalogue-title">Catalogue title</Label><Input autoComplete="off" id="catalogue-title" value={title} onChange={e => { setTitle(e.target.value); invalidate(); }} /></div>
              <div><Label htmlFor="catalogue-artist">Artist</Label><Input autoComplete="off" id="catalogue-artist" value={artist} onChange={e => { setArtist(e.target.value); invalidate(); }} /></div>
            </div>
            <div><Label htmlFor="catalogue-intro">Exhibition text</Label><Textarea autoComplete="off" id="catalogue-intro" value={introduction} onChange={e => { setIntroduction(e.target.value); invalidate(); }} /></div>
            <div><Label htmlFor="catalogue-credits">Credits and image rights</Label><Textarea autoComplete="off" id="catalogue-credits" value={credits} onChange={e => { setCredits(e.target.value); invalidate(); }} /></div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Catalogue layout">
              <Button variant={layout === "single" ? "default" : "outline"} aria-pressed={layout === "single"} onClick={() => { setLayout("single"); invalidate(); }}>One work per page</Button>
              <Button variant={layout === "paired" ? "default" : "outline"} aria-pressed={layout === "paired"} onClick={() => { setLayout("paired"); invalidate(); }}>Two works per page</Button>
            </div>
            <h3 className="text-sm font-medium">Works ({selected.length}/{works.length})</h3>
            {!works.length && <p className="text-sm text-muted-foreground">No artist artworks are linked to this exhibition.</p>}
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {works.map((work, index) => <div key={work.id} className="flex gap-3 py-3 items-start">
                <Checkbox aria-label={`Include ${work.title}`} checked={selected.includes(work.id)} onCheckedChange={checked => { setSelected(ids => checked ? Array.from(new Set([...ids, work.id])) : ids.filter(id => id !== work.id)); invalidate(); }} />
                {work.imageUrl && <img src={work.imageUrl} alt={work.title} className="h-16 w-16 object-contain bg-muted shrink-0" />}
                <div className="flex-1 min-w-0"><p className="text-sm font-medium break-words">{work.title}</p>
                  <Textarea autoComplete="off" aria-label={`Caption for ${work.title}`} className="mt-2 text-xs min-h-20" value={work.caption} onChange={e => { setWorks(items => items.map(item => item.id === work.id ? { ...item, caption: e.target.value } : item)); invalidate(); }} />
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Move ${work.title} up`} title="Move up" disabled={index === 0} onClick={() => { setWorks(movePage(works, index, -1)); invalidate(); }}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Move ${work.title} down`} title="Move down" disabled={index === works.length - 1} onClick={() => { setWorks(movePage(works, index, 1)); invalidate(); }}><ArrowDown className="h-4 w-4" /></Button>
                </div>
              </div>)}
            </div>
          </fieldset>
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !selected.length || !title.trim() || loading} onClick={prepare} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}{busy ? "Preparing…" : "Prepare preview"}</Button>
            {prepared && <Button variant="outline" className="gap-2" onClick={() => void deliverArtworkExport(prepared.blob, `${prepared.title.replace(/[<>:"/\\|?*]/g, "-")}.pdf`).catch(() => toast.error("Unable to download catalogue."))}><Download className="h-4 w-4" />Download PDF</Button>}
          </div>
          {prepared && <>
            {!!prepared.warnings.length && <div role="alert" className="text-sm text-destructive"><p>Missing images in this PDF:</p><ul>{prepared.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
            <div className="min-w-0"><SketchbookReader url={prepared.url} title={prepared.title} allowDownload={false} /></div>
          </>}
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}