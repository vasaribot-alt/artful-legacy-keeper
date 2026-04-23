import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArtworkDuplicateData } from "@/components/AddArtworkDialog";
import { VerificationBadge } from "@/components/VerificationBadge";

interface Artwork {
  id: string;
  title: string;
  artwork_type: string | null;
  medium: string | null;
  year: number | null;
  dimensions: string | null;
  description: string | null;
  image_url: string | null;
  support: string | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  series: string | null;
  is_unique: boolean;
  price: number | null;
  currency: string | null;
  artwork_location: string | null;
  sub_category: string | null;
  status?: string;
  buyer_name?: string | null;
  verification_status?: string | null;
}

import { formatDimensions } from "@/lib/formatDimensions";

import { useNavigate } from "react-router-dom";

export const ArtworkCard = ({ artwork, onDuplicate }: { artwork: Artwork; onDuplicate?: (data: ArtworkDuplicateData) => void }) => {
  const navigate = useNavigate();
  const dims = formatDimensions(artwork.height, artwork.width, artwork.depth) || artwork.dimensions;
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [imageCount, setImageCount] = useState(0);

  useEffect(() => {
    const fetchFirstImage = async () => {
      const { data } = await supabase
        .from("artwork_images")
        .select("storage_path")
        .eq("artwork_id", artwork.id)
        .order("display_order")
        .limit(5);

      if (data && data.length > 0) {
        setImageCount(data.length);
        const { data: urlData } = supabase.storage
          .from("artwork-images")
          .getPublicUrl(data[0].storage_path);
        if (urlData) setThumbnailUrl(urlData.publicUrl);
      }
    };
    fetchFirstImage();
  }, [artwork.id]);

  const displayUrl = thumbnailUrl || artwork.image_url;

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDuplicate) return;
    onDuplicate({
      title: artwork.title + " (copy)",
      artworkType: artwork.artwork_type || "",
      medium: artwork.medium || "",
      year: artwork.year ? String(artwork.year) : "",
      description: artwork.description || "",
      isUnique: artwork.is_unique,
      series: artwork.series || "",
      subCategory: artwork.sub_category || "",
      support: artwork.support || "",
      height: artwork.height ? String(artwork.height) : "",
      width: artwork.width ? String(artwork.width) : "",
      depth: artwork.depth ? String(artwork.depth) : "",
      price: artwork.price ? String(artwork.price) : "",
      currency: artwork.currency || "EUR",
      artworkLocation: artwork.artwork_location || "",
    });
  };

  return (
    <div className="group cursor-pointer" onClick={() => navigate(`/artwork/${artwork.id}`)}>
      <div className="aspect-[3/4] bg-secondary rounded-sm overflow-hidden mb-3 relative">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={artwork.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
        {imageCount > 1 && (
          <span className="absolute bottom-2 right-2 bg-background/80 text-foreground text-[10px] px-1.5 py-0.5 rounded-sm font-mono">
            +{imageCount - 1}
          </span>
        )}
        {onDuplicate && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDuplicate}
            title="Duplicate artwork"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      <div className="flex items-start gap-2">
        <h3 className="text-sm font-medium leading-tight flex-1">{artwork.title}</h3>
        <VerificationBadge status={artwork.verification_status} className="shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
        {artwork.artwork_type && (
          <span>{artwork.artwork_type}{artwork.artwork_type === "Sculpture" && artwork.sub_category ? ` — ${artwork.sub_category}` : ""}</span>
        )}
        {artwork.artwork_type && artwork.year && <span>·</span>}
        {artwork.year && <span>{artwork.year}</span>}
        {artwork.year && artwork.medium && <span>·</span>}
        {artwork.medium && <span>{artwork.medium}</span>}
        {!artwork.is_unique && (
          <>
            <span>·</span>
            <span className="text-foreground/60 uppercase tracking-wider text-[10px]">Edition</span>
          </>
        )}
      </div>
      {dims && <p className="text-xs text-muted-foreground mt-0.5">{dims}</p>}
      {artwork.series && (
        <p className="text-xs text-muted-foreground mt-0.5 italic">{artwork.series}</p>
      )}
      {artwork.artwork_location && (
        <p className="text-xs text-muted-foreground mt-0.5">📍 {artwork.artwork_location}</p>
      )}
      {artwork.status === "sold" && (
        <span className="inline-block mt-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground font-medium">
          Sold — {artwork.buyer_name || "Unknown buyer"}
        </span>
      )}
    </div>
  );
};
