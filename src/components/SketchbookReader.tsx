import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from "lucide-react";

GlobalWorkerOptions.workerSrc = workerUrl;

export function SketchbookReader({ url, title }: { url: string; title: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  useEffect(() => {
    const task = getDocument(url);
    let cancelled = false;
    task.promise.then(document => { if (!cancelled) setPdf(document); }).catch(() => { if (!cancelled) setError("Unable to open this PDF. You can still download it."); });
    return () => { cancelled = true; void task.destroy(); };
  }, [url]);
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    setRendering(true);
    void pdf.getPage(page).then(async sheet => {
      if (cancelled || !canvas.current) return;
      const viewport = sheet.getViewport({ scale: 1.5 * zoom });
      const context = canvas.current.getContext("2d");
      if (!context) return;
      canvas.current.width = viewport.width;
      canvas.current.height = viewport.height;
      task = sheet.render({ canvasContext: context, viewport });
      await task.promise;
      if (!cancelled) setRendering(false);
    }).catch(reason => { if (!cancelled && reason?.name !== "RenderingCancelledException") setError("Unable to display this page."); });
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, page, zoom]);
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" title="Previous page" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm tabular-nums" aria-live="polite">{page} / {pdf?.numPages ?? "…"}</span>
        <Button variant="outline" size="icon" title="Next page" aria-label="Next page" disabled={!pdf || page >= pdf.numPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" title="Zoom out" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(z => z - 0.25)}><ZoomOut className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" title="Zoom in" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(z => z + 0.25)}><ZoomIn className="h-4 w-4" /></Button>
        <Button variant="outline" asChild><a href={url} target="_blank" rel="noreferrer" download={`${title}.pdf`}><Download className="h-4 w-4 mr-2" />PDF</a></Button>
      </div>
    </div>
    {error ? <p role="alert" className="text-destructive">{error}</p> : <div className="h-[65vh] overflow-auto bg-muted border border-border p-3">
      {rendering && <p className="text-sm text-muted-foreground" role="status">Loading page…</p>}
      <canvas ref={canvas} aria-label={`${title}, page ${page}`} className={zoom === 1 ? "max-w-full h-auto mx-auto" : "h-auto mx-auto"} />
    </div>}
  </div>;
}