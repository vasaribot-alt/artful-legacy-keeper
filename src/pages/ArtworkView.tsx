import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pencil, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

interface ArtworkImage {
  id: string;
  storage_path: string;
  display_order: number;
  publicUrl: string;
}

const formatDimensions = (h: number | null, w: number | null, d: number | null) => {
  const parts = [h, w, d].filter((v) => v != null);
  if (parts.length === 0) return null;
  return parts.join(" × ") + " cm";
};

const ArtworkView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [artwork, setArtwork] = useState<any>(null);
  const [images, setImages] = useState<ArtworkImage[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [exhibitions, setExhibitions] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const { data, error } = await supabase.from("artworks").select("*").eq("id", id!).single();
    if (error || !data) { navigate("/dashboard"); return; }
    setArtwork(data);

    const { data: imgs } = await supabase
      .from("artwork_images")
      .select("*")
      .eq("artwork_id", id!)
      .order("display_order");

    if (imgs) {
      setImages(
        imgs.map((img) => {
          const { data: urlData } = supabase.storage.from("artwork-images").getPublicUrl(img.storage_path);
          return { ...img, publicUrl: urlData.publicUrl };
        })
      );
    }

    // Load linked exhibitions
    const { data: exhLinks } = await supabase
      .from("artwork_exhibitions")
      .select("cv_entry_id")
      .eq("artwork_id", id!);

    if (exhLinks && exhLinks.length > 0) {
      const ids = exhLinks.map((l: any) => l.cv_entry_id);
      const { data: entries } = await supabase
        .from("cv_entries")
        .select("*")
        .in("id", ids)
        .order("year", { ascending: false });
      if (entries) setExhibitions(entries);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <AppLayout title={artwork?.title || "Artwork"} headerActions={headerActions}>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!artwork) return null;

  const dims = formatDimensions(artwork.height, artwork.width, artwork.depth) || artwork.dimensions;
  const hasMultipleImages = images.length > 1;

  const headerActions = (
    <>
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate(`/artwork/${id}`)} className="gap-1.5">
        <Pencil className="w-3.5 h-3.5" /> Edit
      </Button>
    </>
  );

  return (
    <AppLayout title={artwork.title} headerActions={headerActions}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Image section */}
          <div className="space-y-3">
            {images.length > 0 ? (
              <>
                <div className="relative aspect-[4/5] bg-secondary rounded-sm overflow-hidden">
                  <img
                    src={images[activeImage]?.publicUrl}
                    alt={artwork.title}
                    className="w-full h-full object-contain"
                  />
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={() => setActiveImage((p) => (p > 0 ? p - 1 : images.length - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveImage((p) => (p < images.length - 1 ? p + 1 : 0))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                {hasMultipleImages && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImage(i)}
                        className={`w-16 h-16 rounded-sm overflow-hidden border-2 shrink-0 transition-colors ${
                          i === activeImage ? "border-foreground" : "border-transparent hover:border-border"
                        }`}
                      >
                        <img src={img.publicUrl} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-[4/5] bg-secondary rounded-sm flex items-center justify-center">
                <p className="text-muted-foreground text-sm">No images</p>
              </div>
            )}
          </div>

          {/* Details section */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight italic">{artwork.title}</h1>
              {artwork.year && (
                <p className="text-muted-foreground mt-1">{artwork.year}</p>
              )}
            </div>

            {/* Key details */}
            <div className="space-y-2">
              {artwork.artwork_type && (
                <DetailRow label="Type" value={artwork.artwork_type} />
              )}
              {artwork.sub_category && (
                <DetailRow label="Sub-category" value={artwork.sub_category} />
              )}
              {artwork.medium && (
                <DetailRow label="Medium" value={artwork.medium} />
              )}
              {artwork.support && (
                <DetailRow label="Support" value={artwork.support} />
              )}
              {dims && (
                <DetailRow label="Dimensions" value={dims} />
              )}
              {artwork.weight && (
                <DetailRow label="Weight" value={`${artwork.weight} kg`} />
              )}
              {artwork.signed && (
                <DetailRow label="Signed" value={artwork.signed} />
              )}
              {artwork.series && (
                <DetailRow label="Series" value={artwork.series} />
              )}
              {!artwork.is_unique && (
                <>
                  <DetailRow label="Edition" value={`Edition of ${artwork.edition_count || "—"}`} />
                  {artwork.artist_proofs && (
                    <DetailRow label="Artist Proofs" value={`${artwork.artist_proofs} AP`} />
                  )}
                </>
              )}
              {artwork.artwork_location && (
                <DetailRow label="Location" value={artwork.artwork_location} />
              )}
            </div>

            {artwork.price && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Price</p>
                  <p className="text-lg font-medium">
                    {new Intl.NumberFormat("en", {
                      style: "currency",
                      currency: artwork.currency || "EUR",
                      minimumFractionDigits: 0,
                    }).format(artwork.price)}
                  </p>
                </div>
              </>
            )}

            {artwork.description && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{artwork.description}</p>
                </div>
              </>
            )}

            {exhibitions.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Exhibition History</p>
                  <ul className="space-y-1.5">
                    {exhibitions.map((ex) => (
                      <li key={ex.id} className="text-sm">
                        {ex.year && <span className="text-muted-foreground mr-2">{ex.year}</span>}
                        <span>{ex.entry_text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {artwork.provenance && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Provenance</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{artwork.provenance}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ViewLayout>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline gap-3">
    <span className="text-xs text-muted-foreground uppercase tracking-wider w-28 shrink-0">{label}</span>
    <span className="text-sm">{value}</span>
  </div>
);

export default ArtworkView;
