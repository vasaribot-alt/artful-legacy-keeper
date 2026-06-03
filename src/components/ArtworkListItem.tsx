import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Checkbox } from "@/components/ui/checkbox";
import { VerificationBadge } from "@/components/VerificationBadge";

interface Artwork {
  id: string;
  title: string;
  artwork_type: string | null;
  medium: string | null;
  year: number | null;
  dimensions: string | null;
  image_url: string | null;
  support: string | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  series: string | null;
  is_unique: boolean;
  artwork_location: string | null;
  sub_category: string | null;
  status?: string;
  buyer_name?: string | null;
  verification_status?: string | null;
}

import { useUnitPreference } from "@/hooks/useUnitPreference";

interface ArtworkListItemProps {
  artwork: Artwork;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (id: string, checked: boolean) => void;
}

export const ArtworkListItem = ({ artwork, selectable, selected, onSelectChange }: ArtworkListItemProps) => {
  const navigate = useNavigate();
  const { formatDims } = useUnitPreference();
  const dims = formatDims(artwork.height, artwork.width, artwork.depth) || artwork.dimensions;
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchFirstImage = async () => {
      const { data } = await supabase
        .from("artwork_images")
        .select("storage_path")
        .eq("artwork_id", artwork.id)
        .order("display_order")
        .limit(1);

      if (data && data.length > 0) {
        const { data: urlData } = supabase.storage
          .from("artwork-images")
          .getPublicUrl(data[0].storage_path);
        if (urlData) setThumbnailUrl(urlData.publicUrl);
      }
    };
    fetchFirstImage();
  }, [artwork.id]);

  const displayUrl = thumbnailUrl || artwork.image_url;

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-sm border border-border hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => {
        if (selectable && onSelectChange) {
          onSelectChange(artwork.id, !selected);
        } else {
          navigate(`/artwork/${artwork.id}`);
        }
      }}
    >
      {selectable && (
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelectChange?.(artwork.id, !!checked)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />
      )}
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div className="w-14 h-14 bg-secondary rounded-sm overflow-hidden shrink-0">
            {displayUrl ? (
              <img src={displayUrl} alt={artwork.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[9px]">No img</div>
            )}
          </div>
        </HoverCardTrigger>
        {displayUrl && (
          <HoverCardContent side="right" align="start" className="w-72 p-1.5">
            <img src={displayUrl} alt={artwork.title} className="w-full h-auto rounded-sm object-contain" />
          </HoverCardContent>
        )}
      </HoverCard>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium truncate">{artwork.title}</h3>
          <VerificationBadge status={artwork.verification_status} className="shrink-0" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {artwork.artwork_type && <span>{artwork.artwork_type}</span>}
          {artwork.year && <><span>·</span><span>{artwork.year}</span></>}
          {artwork.medium && <><span>·</span><span className="truncate max-w-[200px]">{artwork.medium}</span></>}
          {!artwork.is_unique && <><span>·</span><span className="uppercase tracking-wider text-[10px]">Edition</span></>}
        </div>
      </div>
      <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground shrink-0 gap-0.5">
        {dims && <span>{dims}</span>}
        {artwork.artwork_location && <span>📍 {artwork.artwork_location}</span>}
        {artwork.status === "sold" && (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-secondary font-medium">
            Sold — {artwork.buyer_name || "Unknown buyer"}
          </span>
        )}
      </div>
    </div>
  );
};