import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ViewLayout } from "@/components/ViewLayout";

interface ArtworkWithImage {
  id: string;
  title: string;
  artwork_type: string | null;
  medium: string | null;
  year: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  imageUrl: string | null;
}

import { useUnitPreference } from "@/hooks/useUnitPreference";

const ArtworksGalleryView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [artworks, setArtworks] = useState<ArtworkWithImage[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data } = await supabase
        .from("artworks")
        .select("id, title, artwork_type, medium, year, height, width, depth")
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      // Fetch first image for each artwork
      const withImages: ArtworkWithImage[] = await Promise.all(
        data.map(async (art) => {
          const { data: imgs } = await supabase
            .from("artwork_images")
            .select("storage_path")
            .eq("artwork_id", art.id)
            .order("display_order")
            .limit(1);

          let imageUrl: string | null = null;
          if (imgs && imgs.length > 0) {
            const { data: urlData } = supabase.storage
              .from("artwork-images")
              .getPublicUrl(imgs[0].storage_path);
            imageUrl = urlData.publicUrl;
          }
          return { ...art, imageUrl };
        })
      );

      setArtworks(withImages);
      setLoading(false);
    };
    load();
  }, [navigate]);

  if (loading) {
    return (
      <ViewLayout editPath="/dashboard">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </ViewLayout>
    );
  }

  return (
    <ViewLayout editPath="/dashboard">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {artworks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No artworks yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {artworks.map((art) => (
              <div
                key={art.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/artwork/${art.id}/view`)}
              >
                <div className="aspect-[3/4] bg-secondary rounded-sm overflow-hidden mb-3">
                  {art.imageUrl ? (
                    <img
                      src={art.imageUrl}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No image
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-medium italic">{art.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  {art.year && <span>{art.year}</span>}
                  {art.year && art.medium && <span>·</span>}
                  {art.medium && <span className="truncate">{art.medium}</span>}
                </div>
                {formatDims(art.height, art.width, art.depth) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDims(art.height, art.width, art.depth)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ViewLayout>
  );
};

export default ArtworksGalleryView;
