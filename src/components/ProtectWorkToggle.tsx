import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { setArtworkProtection } from "@/lib/protectArtworkImages";
import { toast } from "sonner";

interface Props {
  artworkId: string;
  value: boolean;
  onChange: (next: boolean) => void;
}

/**
 * Per-work protection. When on, the full photo stays in the archive and the
 * public only sees a small watermarked version.
 */
const ProtectWorkToggle = ({ artworkId, value, onChange }: Props) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const toggle = async (next: boolean) => {
    setBusy(true);
    setProgress({ done: 0, total: 0 });
    try {
      const { failed } = await setArtworkProtection(artworkId, next, (done, total) =>
        setProgress({ done, total }),
      );
      if (failed > 0) {
        toast.error(`${failed} photo${failed === 1 ? "" : "s"} could not be prepared. Please try again.`);
      } else {
        onChange(next);
        toast.success(
          next
            ? "Protected. Only a small watermarked version is shown publicly."
            : "Protection removed. The normal photo is shown publicly again.",
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not change protection. Please try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };


  return (
    <div className="rounded-sm border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <ShieldCheck className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <Label className="text-sm font-medium">Protect this work</Label>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              The full photo stays in the archive. Publicly, only a small version with your
              name and the GAWID across it is shown.
            </p>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              Anything a browser can display can still be copied or read by AI crawlers.
              Protection limits what leaves the archive; it cannot make an image
              uncopyable anywhere.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          <Switch checked={value} disabled={busy} onCheckedChange={toggle} />
        </div>
      </div>
    </div>
  );
};

export default ProtectWorkToggle;
