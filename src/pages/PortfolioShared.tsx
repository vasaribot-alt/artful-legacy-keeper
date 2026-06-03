import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SharedArtwork {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  imageUrl: string | null;
}

import { useUnitPreference } from "@/hooks/useUnitPreference";

const PortfolioShared = () => {
  const { token } = useParams<{ token: string }>();
  const [portfolioName, setPortfolioName] = useState("");
  const [artworks, setArtworks] = useState<SharedArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchShared();
  }, [token]);

  const fetchShared = async () => {
    // Find portfolio by share token
    const { data: pData, error: pError } = await supabase
      .from("portfolios")
      .select("id, name")
      .eq("share_token", token!)
      .single();

    if (pError || !pData) { setNotFound(true); setLoading(false); return; }
    setPortfolioName((pData as any).name);

    const { data: paData } = await supabase
      .from("portfolio_artworks")
      .select("artwork_id")
      .eq("portfolio_id", pData.id)
      .order("display_order");

    if (!paData || paData.length === 0) { setArtworks([]); setLoading(false); return; }

    const artworkIds = paData.map((pa) => pa.artwork_id);
    const { data: artData } = await supabase
      .from("artworks")
      .select("id, title, year, medium, height, width, depth")
      .in("id", artworkIds);

    const enriched: SharedArtwork[] = await Promise.all(
      paData.map(async (pa) => {
        const art = artData?.find((a) => a.id === pa.artwork_id);
        const { data: imgs } = await supabase
          .from("artwork_images")
          .select("storage_path")
          .eq("artwork_id", pa.artwork_id)
          .order("display_order")
          .limit(1);
        let imageUrl: string | null = null;
        if (imgs && imgs.length > 0) {
          const { data: urlData } = supabase.storage
            .from("artwork-images")
            .getPublicUrl(imgs[0].storage_path);
          imageUrl = urlData.publicUrl;
        }
        return {
          id: pa.artwork_id,
          title: art?.title || "Untitled",
          year: art?.year || null,
          medium: art?.medium || null,
          height: art?.height || null,
          width: art?.width || null,
          depth: art?.depth || null,
          imageUrl,
        };
      })
    );
    setArtworks(enriched);
    setLoading(false);
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Portfolio not found or link has expired.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-light mb-8">{loading ? "" : portfolioName}</h1>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] bg-secondary animate-pulse rounded-sm" />
            ))}
          </div>
        ) : artworks.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">This portfolio is empty.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {artworks.map((art) => (
              <div key={art.id}>
                <div className="aspect-[3/4] bg-secondary rounded-sm overflow-hidden mb-3">
                  {art.imageUrl ? (
                    <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
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
    </div>
  );
};

export default PortfolioShared;
