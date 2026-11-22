import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildCvPdf, cvPdfFilename, downloadBlob, type CvPdfSection } from "@/lib/cvPdf";

/** Prepares the CV PDF first, then a second click saves it (keeps downloads working on phones). */
export function CvPdfButton({ artistName, sections, label = "Download PDF" }: { artistName: string; sections: CvPdfSection[]; label?: string }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setBlob(null), [artistName, sections]);

  const prepare = async () => {
    setBusy(true);
    try { setBlob(await buildCvPdf(artistName, sections)); }
    catch (e: any) { toast.error(e?.message || "Could not prepare the CV PDF"); }
    finally { setBusy(false); }
  };

  if (blob) {
    return (
      <Button size="sm" onClick={() => downloadBlob(blob, cvPdfFilename(artistName))} className="gap-1.5">
        <Download className="w-4 h-4" /> Save CV PDF
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={prepare} disabled={busy || sections.length === 0} className="gap-1.5">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {label}
    </Button>
  );
}
