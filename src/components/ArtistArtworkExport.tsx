import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createArtworkExport, deliverArtworkExport, loadOwnArtistArtworks } from "@/lib/artistArtworkExport";

export function ArtistArtworkExport() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"csv" | "xlsx">("xlsx");
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<{ blob: Blob; filename: string; count: number } | null>(null);
  async function prepare() {
    setBusy(true);
    try {
      const artworks = await loadOwnArtistArtworks();
      const blob = createArtworkExport(artworks, format);
      setPrepared({ blob, filename: `GARF-Artworks-${new Date().toISOString().slice(0, 10)}.${format}`, count: artworks.length });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not prepare export."); }
    finally { setBusy(false); }
  }
  return <>
    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setPrepared(null); setOpen(true); }}><Download className="w-4 h-4" />Export</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Export all my artworks</DialogTitle></DialogHeader>
        <Label htmlFor="artwork-export-format">File format</Label>
        <Select value={format} disabled={busy} onValueChange={value => { setFormat(value === "csv" ? "csv" : "xlsx"); setPrepared(null); }}>
          <SelectTrigger id="artwork-export-format"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="xlsx">Excel (.xlsx)</SelectItem><SelectItem value="csv">CSV (.csv)</SelectItem></SelectContent>
        </Select>
        {prepared ? <>
          <p className="text-sm text-muted-foreground">{prepared.count} artworks · ready</p>
          <Button className="gap-2" onClick={() => void deliverArtworkExport(prepared.blob, prepared.filename).catch(() => toast.error("Could not download export."))}><Download className="w-4 h-4" />Download {format === "csv" ? "CSV" : "Excel"}</Button>
        </> : <Button className="gap-2" disabled={busy} onClick={prepare}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}{busy ? "Preparing…" : "Prepare export"}</Button>}
      </DialogContent>
    </Dialog>
  </>;
}