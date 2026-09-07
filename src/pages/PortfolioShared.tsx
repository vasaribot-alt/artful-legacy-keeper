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
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  imageUrls: string[];
}


import { useUnitPreference } from "@/hooks/useUnitPreference";
import { ImageLightbox } from "@/components/ImageLightbox";
import { formatPrice } from "@/lib/formatPrice";


const PortfolioShared = () => {
  const { token } = useParams<{ token: string }>();
  const { formatDims } = useUnitPreference();
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; caption?: string } | null>(null);
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
      image_paths: string[] | null;
      price: number | null;
      currency: string | null;
    }>;

    setPortfolioName(rows[0].portfolio_name);

    const toUrl = (path: string) =>
      supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;

    const enriched: SharedArtwork[] = rows.map((r) => {
      const paths = r.image_paths && r.image_paths.length > 0
        ? r.image_paths
        : r.image_path
          ? [r.image_path]
          : [];
      const imageUrls = paths.map(toUrl);
      return {
        id: r.artwork_id,
        title: r.title || "Untitled",
        year: r.year,
        medium: r.medium,
        height: r.height,
        width: r.width,
        depth: r.depth,
        price: r.price ?? null,
        currency: r.currency ?? null,
        imageUrl: imageUrls[0] ?? null,
        imageUrls,
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
                <div className="aspect-[3/4] bg-secondary rounded-sm overflow-hidden mb-3 relative">
                  {art.imageUrl ? (
                    <>
                      <img
                        src={art.imageUrl}
                        alt={art.title}
                        className="w-full h-full object-cover cursor-zoom-in"
                        loading="lazy"
                        onClick={() =>
                          setLightbox({
                            images: art.imageUrls,
                            index: 0,
                            caption: [art.title, art.year, art.medium].filter(Boolean).join(", "),
                          })
                        }
                      />
                      {art.imageUrls.length > 1 && (
                        <span className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded-sm bg-background/85 text-foreground">
                          {art.imageUrls.length} photos
                        </span>
                      )}
                    </>
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

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          caption={lightbox.caption}
          onIndexChange={(i) => setLightbox((prev) => (prev ? { ...prev, index: i } : prev))}
          onClose={() => setLightbox(null)}
        />
      )}

    </div>
  );
};

export default PortfolioShared;
