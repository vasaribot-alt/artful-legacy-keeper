import { ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  status: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Visual indicator of an artwork's artist-verification status.
 * - verified: dark "Artist verified" pill with shield-check icon
 * - pending:  amber "Pending artist review" pill with clock icon
 * - anything else (or unverified): nothing rendered
 */
export const VerificationBadge = ({ status, size = "sm", className }: VerificationBadgeProps) => {
  if (status === "verified") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-sm bg-foreground text-background font-medium tracking-wide",
          size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
          className
        )}
        title="Verified by the artist"
      >
        <ShieldCheck className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        Artist verified
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-sm border border-border bg-secondary text-foreground/70 font-medium tracking-wide",
          size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
          className
        )}
        title="Awaiting artist review"
      >
        <Clock className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        Pending review
      </span>
    );
  }
  return null;
};
