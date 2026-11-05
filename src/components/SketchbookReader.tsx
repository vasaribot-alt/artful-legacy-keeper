import { forwardRef, useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { fitSketchbookPage } from "@/lib/sketchbookReader";

GlobalWorkerOptions.workerSrc = workerUrl;

export const SketchbookReader = forwardRef<HTMLDivElement, { url: string; title: string; allowDownload?: boolean }>(function SketchbookReader({ url, title, allowDownload = true }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    if (!allowDownload) return;
    setDownloading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const localUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = localUrl; link.download = `${title}.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(localUrl), 10000);
    } catch { toast.error("Unable to download PDF. Please reopen the sketchbook and retry."); }
    finally { setDownloading(false); }
  };
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize({ width: element.clientWidth - 24, height: element.clientHeight - 24 }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setPdf(null); setPage(1); setZoom(1); setError(""); setRendering(true);
    const task = getDocument(url);
    let cancelled = false;
    task.promise.then(document => { if (!cancelled) setPdf(document); }).catch(() => { if (!cancelled) setError("Unable to open this PDF."); });
    return () => { cancelled = true; void task.destroy(); };
  }, [url]);
  useEffect(() => {
    if (!pdf || size.width <= 0 || size.height <= 0) return;
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    setRendering(true);
    void pdf.getPage(page).then(async sheet => {
      if (cancelled || !canvas.current) return;
      const natural = sheet.getViewport({ scale: 1 });
      const scale = fitSketchbookPage(natural.width, natural.height, size.width, size.height) * zoom;
      const display = sheet.getViewport({ scale });
      const viewport = sheet.getViewport({ scale: scale * (window.devicePixelRatio || 1) });
      const context = canvas.current.getContext("2d");
      if (!context) return;
      canvas.current.width = viewport.width;
      canvas.current.height = viewport.height;
      canvas.current.style.width = `${display.width}px`;
      canvas.current.style.height = `${display.height}px`;
      task = sheet.render({ canvasContext: context, viewport });
      await task.promise;
      if (!cancelled) setRendering(false);
    }).catch(reason => { if (!cancelled && reason?.name !== "RenderingCancelledException") setError("Unable to display this page."); });
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, page, zoom, size]);
  return <div ref={ref} className="space-y-3 min-w-0 max-w-full">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" title="Previous page" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm tabular-nums" aria-live="polite">{page} / {pdf?.numPages ?? "…"}</span>
        <Button variant="outline" size="icon" title="Next page" aria-label="Next page" disabled={!pdf || page >= pdf.numPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" title="Zoom out" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(z => z - 0.25)}><ZoomOut className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" title="Zoom in" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(z => z + 0.25)}><ZoomIn className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" title="Fit page" aria-label="Fit page" disabled={zoom === 1} onClick={() => setZoom(1)}><Maximize className="h-4 w-4" /></Button>
        {allowDownload && <Button variant="outline" disabled={downloading} onClick={download}><Download className="h-4 w-4 mr-2" />PDF</Button>}
      </div>
    </div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div ref={surface} className="relative min-w-0 max-w-full h-[60dvh] overflow-auto bg-muted border border-border p-3" aria-busy={rendering}>
      {rendering && <p className="absolute top-3 left-3 text-sm text-muted-foreground" role="status">Loading page…</p>}
      <canvas ref={canvas} aria-label={`${title}, page ${page}`} className={`mx-auto ${rendering || error ? "invisible" : ""}`} />
    </div>
  </div>;
});