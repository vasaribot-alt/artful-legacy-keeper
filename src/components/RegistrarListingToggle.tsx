import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";

export function RegistrarListingToggle() {
  const [isListed, setIsListed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("registrar_profiles")
        .select("is_listed")
        .eq("user_id", uid)
        .maybeSingle();
      setIsListed((data as { is_listed: boolean } | null)?.is_listed ?? null);
    })();
  }, []);

  if (isListed === null) return null;

  const toggle = async () => {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setSaving(false);
      return;
    }
    const next = !isListed;
    const { error } = await supabase
      .from("registrar_profiles")
      .update({ is_listed: next })
      .eq("user_id", uid);
    if (error) {
      toast.error("Could not update your listing");
    } else {
      setIsListed(next);
      toast.success(
        next
          ? "Your presentation is visible in the directory"
          : "Your presentation has been removed from the directory"
      );
    }
    setSaving(false);
  };

  return (
    <div className="mt-8 max-w-md mx-auto p-4 border border-border rounded-sm text-left space-y-3">
      <p className="text-sm font-medium">Directory visibility</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {isListed
          ? "Your presentation is currently public in the registrar directory."
          : "Your presentation is hidden. You keep your verified status, but you do not appear in the public directory."}
      </p>
      <Button variant="outline" size="sm" onClick={toggle} disabled={saving} className="gap-1.5">
        {isListed ? (
          <>
            <EyeOff className="w-3.5 h-3.5" /> Remove my presentation
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5" /> Show my presentation
          </>
        )}
      </Button>
    </div>
  );
}
