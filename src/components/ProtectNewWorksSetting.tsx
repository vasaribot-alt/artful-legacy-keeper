import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Profile-level default: newly registered works start protected, so the full
 * photo stays in the archive and the public only sees a small watermarked one.
 * Turning it on also offers to apply protection to works already registered.
 */
const ProtectNewWorksSetting = () => {
  const [value, setValue] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offerBackfill, setOfferBackfill] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("protect_new_artworks")
        .eq("user_id", user.id)
        .maybeSingle();
      setValue(Boolean((data as { protect_new_artworks?: boolean } | null)?.protect_new_artworks));
      setLoaded(true);
    })();
  }, []);

  const toggle = async (next: boolean) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ protect_new_artworks: next })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save that setting. Please try again.");
      return;
    }
    setValue(next);
    setOfferBackfill(next);
    toast.success(next ? "New works will be protected." : "New works will not be protected.");
  };

  const applyToExisting = async () => {
    setBackfilling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: works } = await supabase
        .from("artworks")
        .select("id")
        .eq("owner_id", user.id)
        .eq("role_context", "artist")
        .eq("protected_display", false);
      const list = works || [];
      setProgress({ done: 0, total: list.length });
      let failures = 0;
      for (let i = 0; i < list.length; i++) {
        const { error } = await supabase.functions.invoke("protect-artwork-image", {
          body: { artwork_id: list[i].id, mode: "protect" },
        });
        if (error) failures++;
        setProgress({ done: i + 1, total: list.length });
      }
      setOfferBackfill(false);
      if (failures > 0) {
        toast.warning(`Protected ${list.length - failures} of ${list.length} works. Some could not be processed.`);
      } else {
        toast.success(`Protected ${list.length} work${list.length === 1 ? "" : "s"}.`);
      }
    } finally {
      setBackfilling(false);
      setProgress(null);
    }
  };

  if (!loaded) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Image protection</h2>
      <p className="text-sm text-muted-foreground">
        For digital works, or whenever you do not want full-size images in public, keep the
        full photo in the archive and show only a small watermarked version.
      </p>
      <div className="flex items-center justify-between p-4 border border-border rounded-sm bg-secondary/30">
        <div className="pr-4">
          <Label className="text-base">Protect new works by default</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Applies to works you register from now on. You can change it per work.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          <Switch checked={value} disabled={saving} onCheckedChange={toggle} />
        </div>
      </div>
      {offerBackfill && (
        <div className="p-4 border border-border rounded-sm space-y-3">
          <p className="text-sm">Apply protection to the works you have already registered?</p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={applyToExisting} disabled={backfilling}>
              {backfilling
                ? progress
                  ? `Protecting ${progress.done} of ${progress.total}…`
                  : "Working…"
                : "Apply to all my existing works"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOfferBackfill(false)} disabled={backfilling}>
              Not now
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Anything a browser can show can still be saved or read by AI crawlers — on any website.
        Protection controls what leaves the archive, it cannot make an image uncopyable.
      </p>
    </section>
  );
};

export default ProtectNewWorksSetting;
