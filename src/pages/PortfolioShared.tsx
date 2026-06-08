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
  const { formatDims } = useUnitPreference();
  const [portfolioName, setPortfolioName] = useState("");
  const [artworks, setArtworks] = useState<SharedArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchShared();
  }, [token]);

  const fetchShared = async () => {
    // Fetch shared portfolio + artworks via security-definer RPC.
    // The portfolios / portfolio_artworks tables are no longer readable anonymously
    // to prevent token enumeration.
    const { data, error } = await supabase
      .rpc("get_shared_portfolio", { _token: token! });

    if (error || !data || data.length === 0) {
      // Distinguish empty portfolio from missing one by checking again with name only
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setArtworks([]);
      setLoading(false);
      return;
    }

    const rows = data as Array<{
      portfolio_id: string;
      portfolio_name: string;
      artwork_id: string;
      title: string;
      year: number | null;
      medium: string | null;
      height: number | null;
      width: number | null;
      depth: number | null;
      display_order: number;
      image_path: string | null;
    }>;

    setPortfolioName(rows[0].portfolio_name);

    const enriched: SharedArtwork[] = rows.map((r) => {
      let imageUrl: string | null = null;
      if (r.image_path) {
        const { data: urlData } = supabase.storage
          .from("artwork-images")
          .getPublicUrl(r.image_path);
        imageUrl = urlData.publicUrl;
      }
      return {
        id: r.artwork_id,
        title: r.title || "Untitled",
        year: r.year,
        medium: r.medium,
        height: r.height,
        width: r.width,
        depth: r.depth,
        imageUrl,
      };
    });

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
