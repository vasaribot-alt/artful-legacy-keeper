import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, ShieldX, ChevronDown, ChevronUp, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PendingArtwork {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
  created_at: string;
  imageUrl: string | null;
}

interface PendingVerificationInboxProps {
  userId: string;
  activeRole: string;
  /** Called after one or more works are verified so the parent list can refetch */
  onVerified?: () => void;
}

export const PendingVerificationInbox = ({ userId, activeRole, onVerified }: PendingVerificationInboxProps) => {
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState(false);
  const [declineTargets, setDeclineTargets] = useState<string[] | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  // Only the artist role uses the verification badge — collectors/registrars don't see it
  const enabled = activeRole === "artist";

  const load = async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("artworks")
      .select("id, title, year, medium, created_at")
      .eq("owner_id", userId)
      .eq("role_context", "artist")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false });

    if (!data) { setPending([]); setLoading(false); return; }

    // Fetch first image per artwork for preview
    const ids = data.map((a) => a.id);
    const { data: imgs } = ids.length
      ? await supabase
          .from("artwork_images")
          .select("artwork_id, storage_path, display_order")
          .in("artwork_id", ids)
          .order("display_order")
      : { data: [] };

    const thumbMap: Record<string, string> = {};
    (imgs || []).forEach((img: any) => {
      if (!thumbMap[img.artwork_id]) {
        const { data: urlData } = supabase.storage.from("artwork-images").getPublicUrl(img.storage_path);
        if (urlData) thumbMap[img.artwork_id] = urlData.publicUrl;
      }
    });

    setPending(
      data.map((a) => ({
        ...a,
        imageUrl: thumbMap[a.id] || null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeRole]);

  if (!enabled || loading || pending.length === 0) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === pending.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pending.map((p) => p.id)));
  };

  const verify = async (ids: string[]) => {
    if (ids.length === 0) return;
    setVerifying(true);
    const { error } = await supabase
      .from("artworks")
      .update({
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: userId,
      })
      .in("id", ids);
    setVerifying(false);
    if (error) {
      toast.error("Could not verify");
      return;
    }
    toast.success(`Verified ${ids.length} work${ids.length !== 1 ? "s" : ""}`);
    setSelectedIds(new Set());
    await load();
    onVerified?.();
  };

  const confirmDecline = async () => {
    if (!declineTargets || declineTargets.length === 0) return;
    setDeclining(true);
    const { error } = await supabase
      .from("artworks")
      .update({
        verification_status: "declined",
        decline_reason: declineReason.trim() || null,
        verified_at: null,
        verified_by: null,
      } as any)
      .in("id", declineTargets);
    setDeclining(false);
    if (error) {
      toast.error("Could not decline");
      return;
    }
    toast.success(`Declined ${declineTargets.length} work${declineTargets.length !== 1 ? "s" : ""}`);
    setDeclineTargets(null);
    setDeclineReason("");
    setSelectedIds(new Set());
    await load();
    onVerified?.();
  };



  return (
    <div className="mb-8 border border-border rounded-sm bg-secondary/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
      >
        <ShieldCheck className="w-5 h-5 text-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {pending.length} work{pending.length !== 1 ? "s" : ""} awaiting your verification
          </p>
          <p className="text-xs text-muted-foreground">
            Added by your registrar. Review and verify to grant the "Artist verified" tag.
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border bg-background">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-secondary/30">
            <Checkbox
              checked={selectedIds.size === pending.length && pending.length > 0}
              onCheckedChange={toggleAll}
            />
            <span className="text-xs text-muted-foreground flex-1">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={verifying || pending.length === 0}
              onClick={() => verify(pending.map((p) => p.id))}
              className="gap-1.5"
            >
              {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Verify all ({pending.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={declining || selectedIds.size === 0}
              onClick={() => { setDeclineReason(""); setDeclineTargets(Array.from(selectedIds)); }}
              className="gap-1.5"
            >
              <ShieldX className="w-3.5 h-3.5" />
              Decline selected
            </Button>
            <Button
              size="sm"
              disabled={verifying || selectedIds.size === 0}
              onClick={() => verify(Array.from(selectedIds))}
              className="gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Verify selected
            </Button>
          </div>

          <ul className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {pending.map((art) => (
              <li
                key={art.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors"
              >
                <Checkbox
                  checked={selectedIds.has(art.id)}
                  onCheckedChange={() => toggle(art.id)}
                />
                <div className="w-12 h-12 rounded-sm bg-secondary overflow-hidden shrink-0">
                  {art.imageUrl ? (
                    <img src={art.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[9px]">—</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{art.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[art.year, art.medium].filter(Boolean).join(" · ") || "No details"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={() => navigate(`/artwork/${art.id}`)}
                >
                  <Pencil className="w-3 h-3" /> Review
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8"
                  disabled={verifying}
                  onClick={() => verify([art.id])}
                >
                  <ShieldCheck className="w-3 h-3" /> Verify
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
