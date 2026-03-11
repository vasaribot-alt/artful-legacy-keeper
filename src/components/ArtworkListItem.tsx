import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
}

const formatDimensions = (h: number | null, w: number | null, d: number | null) => {
  const parts = [h, w, d].filter((v) => v != null);
  if (parts.length === 0) return null;
  return parts.join(" × ") + " cm";
};

export const ArtworkListItem = ({ artwork }: { artwork: Artwork }) => {
  const navigate = useNavigate();
  const dims = formatDimensions(artwork.height, artwork.width, artwork.depth) || artwork.dimensions;
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
      onClick={() => navigate(`/artwork/${artwork.id}`)}
    >
      <div className="w-14 h-14 bg-secondary rounded-sm overflow-hidden shrink-0">
        {displayUrl ? (
          <img src={displayUrl} alt={artwork.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[9px]">No img</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate">{artwork.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {artwork.artwork_type && <span>{artwork.artwork_type}</span>}
          {artwork.year && <><span>·</span><span>{artwork.year}</span></>}
          {artwork.medium && <><span>·</span><span className="truncate max-w-[200px]">{artwork.medium}</span></>}
          {!artwork.is_unique && <><span>·</span><span className="uppercase tracking-wider text-[10px]">Edition</span></>}
        </div>
      </div>
      <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground shrink-0">
        {dims && <span>{dims}</span>}
        {artwork.artwork_location && <span>📍 {artwork.artwork_location}</span>}
      </div>
    </div>
  );
};
