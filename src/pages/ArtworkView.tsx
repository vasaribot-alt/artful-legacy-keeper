import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pencil, ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

interface ArtworkImage {
  id: string;
  storage_path: string;
  display_order: number;
  publicUrl: string;
}

import { useUnitPreference } from "@/hooks/useUnitPreference";

const ArtworkView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatDims: formatDimensionsFn } = useUnitPreference();
  const [loading, setLoading] = useState(true);
  const [artwork, setArtwork] = useState<any>(null);
  const [images, setImages] = useState<ArtworkImage[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const [catalogues, setCatalogues] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [siblingIds, setSiblingIds] = useState<{ prev: string | null; next: string | null }>({ prev: null, next: null });

  // Load sibling artwork IDs for prev/next navigation
  useEffect(() => {
    if (!id) return;
    const loadSiblings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const activeRole = localStorage.getItem("activeRole") || "artist";
      const { data } = await supabase
        .from("artworks")
        .select("id")
        .eq("owner_id", user.id)
        .eq("role_context", activeRole)
        .order("created_at", { ascending: false });
      if (!data) return;
      const idx = data.findIndex((a) => a.id === id);
      setSiblingIds({
        prev: idx > 0 ? data[idx - 1].id : null,
        next: idx < data.length - 1 ? data[idx + 1].id : null,
      });
    };
    loadSiblings();
  }, [id]);

  // Keyboard shortcuts for prev/next navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === "ArrowLeft" && siblingIds.prev) {
        navigate(`/artwork/${siblingIds.prev}/view`);
      } else if (e.key === "ArrowRight" && siblingIds.next) {
        navigate(`/artwork/${siblingIds.next}/view`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [siblingIds, navigate]);

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
        imgs.map((img: any) => {
          const bucket = img.web_storage_path ? "artwork-images-web" : "artwork-images";
          const path = img.web_storage_path || img.storage_path;
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
          return { ...img, publicUrl: urlData.publicUrl };
        })
      );
    }

    // Load attached documents
    const { data: docs } = await supabase
      .from("artwork_documents")
      .select("*")
      .eq("artwork_id", id!)
      .order("created_at");
    if (docs) setDocuments(docs);

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

    // Load linked catalogues
    const { data: catLinks } = await supabase
      .from("artwork_catalogues")
      .select("catalogue_id")
      .eq("artwork_id", id!);

    if (catLinks && catLinks.length > 0) {
      const catIds = catLinks.map((l: any) => l.catalogue_id);
      const { data: cats } = await supabase
        .from("catalogues")
        .select("*")
        .in("id", catIds)
        .order("publication_year", { ascending: false });
      if (cats) setCatalogues(cats);
    }

    setLoading(false);
  };

  const openDocument = async (doc: any) => {
    const { data, error } = await supabase.storage
      .from("artwork-documents")
      .createSignedUrl(doc.storage_path, 60 * 10);
    if (error || !data?.signedUrl) {
      toast.error("Could not open document");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  if (loading) {
    return (
      <AppLayout title="Artwork">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!artwork) return null;

  const dims = formatDimensionsFn(artwork.height, artwork.width, artwork.depth) || artwork.dimensions;
  const hasMultipleImages = images.length > 1;

  const headerActions = (
    <>
      <Button variant="ghost" size="sm" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/dashboard"))}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!siblingIds.prev}
          onClick={() => siblingIds.prev && navigate(`/artwork/${siblingIds.prev}/view`)}
          title="Previous artwork (←)"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!siblingIds.next}
          onClick={() => siblingIds.next && navigate(`/artwork/${siblingIds.next}/view`)}
          title="Next artwork (→)"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
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
              {artwork.artist_name && (
                <p className="text-base text-muted-foreground mt-0.5">{artwork.artist_name}</p>
              )}
              {artwork.year && (
                <p className="text-muted-foreground mt-1">{artwork.year}</p>
              )}
              {artwork.global_artwork_id && (
                <p className="text-xs text-muted-foreground font-mono mt-1.5">
                  GAWID-{artwork.global_artwork_id}
                </p>
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
              {!artwork.is_unique && (() => {
                const [no, total] = String(artwork.edition_number || "").split("/").map((s: string) => s.trim());
                const editionValue = no && total
                  ? `${no} of ${total}`
                  : artwork.edition_number
                    ? artwork.edition_number
                    : artwork.edition_count
                      ? `Edition of ${artwork.edition_count}`
                      : null;
                return (
                  <>
                    {editionValue && <DetailRow label="Edition" value={editionValue} />}
                    {artwork.artist_proofs && (
                      <DetailRow label="Artist Proofs" value={`${artwork.artist_proofs} AP`} />
                    )}
                  </>
                );
              })()}
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

            {documents.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Documents</p>
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => openDocument(doc)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-sm border border-border bg-secondary/50 text-left hover:bg-secondary transition-colors"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{doc.file_name}</span>
                        {doc.file_size && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {(doc.file_size / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {catalogues.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Catalogues</p>
                  <ul className="space-y-2">
                    {catalogues.map((cat: any) => (
                      <li key={cat.id} className="text-sm">
                        <span className="font-medium">{cat.title}</span>
                        {cat.publication_year && (
                          <span className="text-muted-foreground ml-1">({cat.publication_year})</span>
                        )}
                        {cat.publisher && (
                          <span className="text-muted-foreground block text-xs">{cat.publisher}</span>
                        )}
                        {cat.authors && (
                          <span className="text-muted-foreground block text-xs">{cat.authors}</span>
                        )}
                        {cat.isbn && (
                          <span className="text-muted-foreground block text-xs font-mono">ISBN {cat.isbn}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline gap-3">
    <span className="text-xs text-muted-foreground uppercase tracking-wider w-28 shrink-0">{label}</span>
    <span className="text-sm">{value}</span>
  </div>
);

export default ArtworkView;
