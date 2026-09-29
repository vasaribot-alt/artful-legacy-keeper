import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Archive, Check, X, Loader2 } from "lucide-react";

interface OrphanArtwork {
  id: string;
  artist_name: string;
  title: string | null;
  year: string | null;
  medium: string | null;
  support: string | null;
  dimensions: string | null;
  edition_info: string | null;
  image_url: string | null;
  source_institution: string | null;
  notes: string | null;
  status: string;
}

interface Props {
  userId: string;
  activeRole: string;
  onClaimed?: () => void;
}

/**
 * Shows works from the bulk (unclaimed) database that match the signed-in
 * artist's name. The artist claims a work — it is copied into their own
 * catalogue and removed from the bulk DB — or marks it as not theirs.
 */
export function OrphanClaimsCard({ userId, activeRole, onClaimed }: Props) {
  const [works, setWorks] = useState<OrphanArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("orphan_artworks")
      .select("*")
      .in("status", ["unclaimed", "presented"]);
    if (!error) setWorks((data as OrphanArtwork[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (activeRole === "artist") load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeRole]);

  const claim = async (w: OrphanArtwork) => {
    setBusyId(w.id);
    const yearNum = w.year && /^\d{4}$/.test(w.year.trim()) ? parseInt(w.year.trim(), 10) : null;
    const { data: inserted, error: insertError } = await supabase
      .from("artworks")
      .insert({
        owner_id: userId,
        role_context: "artist",
        title: w.title || "Untitled",
        year: yearNum,
        medium: w.medium,
        support: w.support,
        dimensions: w.dimensions,
        image_url: w.image_url,
        description: w.notes,
      } as any)
      .select("id")
      .single();

    if (insertError) {
      toast.error(insertError.message);
      setBusyId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("orphan_artworks")
      .update({
        status: "claimed",
        claimed_by: userId,
        claimed_at: new Date().toISOString(),
        claimed_artwork_id: inserted.id,
      })
      .eq("id", w.id);

    setBusyId(null);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    toast.success(`"${w.title || "Untitled"}" added to your catalogue`);
    load();
    onClaimed?.();
  };

  const decline = async (w: OrphanArtwork) => {
    setBusyId(w.id);
    const { error } = await supabase
      .from("orphan_artworks")
      .update({ status: "declined", claimed_by: userId, claimed_at: new Date().toISOString() })
      .eq("id", w.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked as not yours");
    load();
  };

  if (loading || works.length === 0) return null;

  return (
    <div className="border border-border rounded-lg p-5 mb-6 bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Archive className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-medium">Works waiting for you</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Institutions and galleries have reported these works under your name.
        Claim the ones that are yours — they move straight into your catalogue.
      </p>
      <div className="divide-y divide-border">
        {works.map((w) => (
          <div key={w.id} className="py-3 flex items-start gap-4">
            {w.image_url && (
              <img
                src={w.image_url}
                alt={w.title ?? ""}
                className="h-14 w-14 object-cover rounded border border-border shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {w.title || "Untitled"}
                {w.year ? ` (${w.year})` : ""}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {[w.medium, w.support, w.dimensions, w.edition_info].filter(Boolean).join(" · ")}
              </p>
              {w.source_institution && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reported by {w.source_institution}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => claim(w)}
                disabled={busyId === w.id}
              >
                {busyId === w.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                This is mine
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => decline(w)}
                disabled={busyId === w.id}
              >
                <X className="h-4 w-4 mr-1" /> Not mine
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
