import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const tierLabels: Record<string, string> = {
  internationally_established: "Founding Artist — Internationally Established",
  mid_career: "Founding Artist — Mid-Career",
  emerging: "Founding Artist — Emerging & Global Voices",
};

interface FoundingArtistBadgeProps {
  tier: string;
  className?: string;
}

export function FoundingArtistBadge({ tier, className }: FoundingArtistBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 py-1 px-3 border-foreground/20 text-foreground ${className || ""}`}
    >
      <Award className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{tierLabels[tier] || "Founding Artist"}</span>
    </Badge>
  );
}
