import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export interface UnlinkedUpload {
  id: string;
  storage_path: string;
  web_storage_path: string | null;
  file_name: string;
  file_size: number | null;
  original_size: number | null;
  mime_type: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  onPick: (uploads: UnlinkedUpload[]) => void;
}

export const UnlinkedFilesPicker = ({ open, onOpenChange, userId, onPick }: Props) => {
  const [uploads, setUploads] = useState<UnlinkedUpload[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_uploads")
        .select("id, storage_path, web_storage_path, file_name, file_size, original_size, mime_type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const list = (data || []) as UnlinkedUpload[];
      setUploads(list);
      const t: Record<string, string> = {};
      list.forEach((u) => {
        const path = u.web_storage_path || u.storage_path;
        const { data: url } = supabase.storage.from("artwork-images").getPublicUrl(path);
        t[u.id] = url.publicUrl;
      });
      setThumbs(t);
      setLoading(false);
    })();
  }, [open, userId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    const picked = uploads.filter((u) => selected.has(u.id));
    onPick(picked);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose from your Files</DialogTitle>
          <DialogDescription>
            Pick previously uploaded images that aren't yet attached to an artwork.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-square bg-secondary animate-pulse rounded-sm" />
            ))}
          </div>
        ) : uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No unlinked images yet. Upload images on the Files page to use them here.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {uploads.map((u) => {
              const isSelected = selected.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className={`relative aspect-square rounded-sm overflow-hidden border-2 transition-all ${
                    isSelected ? "border-foreground ring-2 ring-foreground/20" : "border-border hover:border-foreground/40"
                  }`}
                >
                  {thumbs[u.id] ? (
                    <img src={thumbs[u.id]} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-secondary" />
                  )}
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-foreground text-background rounded-full p-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={confirm} disabled={selected.size === 0}>
              Use {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
