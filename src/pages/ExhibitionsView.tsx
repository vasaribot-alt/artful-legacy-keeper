import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ViewLayout } from "@/components/ViewLayout";
import { Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";

interface ExhibitionWithImage {
  id: string;
  title: string;
  exhibition_type: string;
  opening_date: string | null;
  closing_date: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  curator: string | null;
  artists: string | null;
  exhibition_text: string | null;
  mainImageUrl: string | null;
}

interface ExhibitionImage {
  id: string;
  storage_path: string;
  display_order: number;
  caption: string | null;
  publicUrl: string;
}

const ExhibitionsView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exhibitions, setExhibitions] = useState<ExhibitionWithImage[]>([]);
  const [filter, setFilter] = useState<"all" | "solo" | "group">("all");

  // Lightbox state
  const [selectedExhibition, setSelectedExhibition] = useState<ExhibitionWithImage | null>(null);
  const [exhibitionImages, setExhibitionImages] = useState<ExhibitionImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data: exs } = await supabase
        .from("exhibitions")
        .select("id, title, exhibition_type, opening_date, closing_date, venue, city, country, description, curator, artists, exhibition_text")
        .eq("user_id", session.user.id)
        .order("opening_date", { ascending: false });

      if (!exs?.length) { setExhibitions([]); setLoading(false); return; }

      const exIds = exs.map(e => e.id);
      const { data: images } = await supabase
        .from("exhibition_images")
        .select("exhibition_id, storage_path")
        .in("exhibition_id", exIds)
        .eq("display_order", 0);

      const imageMap = new Map<string, string>();
      if (images) {
        for (const img of images) {
          const { data: urlData } = supabase.storage
            .from("exhibition-images")
            .getPublicUrl(img.storage_path);
          imageMap.set(img.exhibition_id, urlData.publicUrl);
        }
      }

      setExhibitions(exs.map(ex => ({
        ...ex,
        mainImageUrl: imageMap.get(ex.id) || null,
      })));
      setLoading(false);
    };
    load();
  }, [navigate]);

  const openExhibition = useCallback(async (ex: ExhibitionWithImage) => {
    setSelectedExhibition(ex);
    setLoadingImages(true);
    const { data } = await supabase
      .from("exhibition_images")
      .select("id, storage_path, display_order, caption")
      .eq("exhibition_id", ex.id)
      .order("display_order", { ascending: true });

    const imgs: ExhibitionImage[] = (data || []).map(img => {
      const { data: urlData } = supabase.storage
        .from("exhibition-images")
        .getPublicUrl(img.storage_path);
      return { ...img, publicUrl: urlData.publicUrl };
    });
    setExhibitionImages(imgs);
    setLoadingImages(false);
  }, []);

  const closeExhibition = () => {
    setSelectedExhibition(null);
    setExhibitionImages([]);
    setLightboxIndex(null);
  };

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight" && lightboxIndex < exhibitionImages.length - 1) setLightboxIndex(lightboxIndex + 1);
      if (e.key === "ArrowLeft" && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, exhibitionImages.length]);

  const filtered = filter === "all"
    ? exhibitions
    : exhibitions.filter(e => e.exhibition_type === filter);

  const grouped = new Map<string, ExhibitionWithImage[]>();
  for (const ex of filtered) {
    const year = ex.opening_date
      ? new Date(ex.opening_date).getFullYear().toString()
      : "Unknown";
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year)!.push(ex);
  }

  const years = Array.from(grouped.keys()).sort((a, b) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return Number(b) - Number(a);
  });

  const formatDateRange = (opening: string | null, closing: string | null) => {
    if (!opening) return "";
    const fmt = (d: string) => {
      const date = new Date(d);
      return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    };
    if (!closing) return fmt(opening);
    return `${fmt(opening)} – ${fmt(closing)}`;
  };

  if (loading) {
    return (
      <ViewLayout editPath="/exhibitions">
        <div className="flex justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </ViewLayout>
    );
  }

  return (
    <ViewLayout editPath="/exhibitions">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Filter tabs */}
        <div className="flex gap-1 mb-10">
          {(["all", "solo", "group"] as const).map(t => {
            const count = t === "all"
              ? exhibitions.length
              : exhibitions.filter(e => e.exhibition_type === t).length;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                  filter === t
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {t === "all" ? "All" : t === "solo" ? "Solo" : "Group"} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">No exhibitions to display.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border hidden md:block" />

            {years.map((year) => {
              const yearExhibitions = grouped.get(year)!;
              return (
                <div key={year} className="mb-12">
                  <h2 className="font-serif text-3xl font-bold mb-6">{year}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                    {yearExhibitions.map((ex) => (
                      <div
                        key={ex.id}
                        className="group cursor-pointer"
                        onClick={() => openExhibition(ex)}
                      >
                        {ex.mainImageUrl ? (
                          <div className="relative aspect-[4/3] bg-muted mb-3 overflow-hidden">
                            <img
                              src={ex.mainImageUrl}
                              alt={ex.title}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="aspect-[4/3] bg-muted mb-3 flex items-center justify-center group-hover:bg-accent transition-colors">
                            <span className="text-xs text-muted-foreground">No image</span>
                          </div>
                        )}
                        <div className="text-center space-y-0.5">
                          <h3 className="font-semibold text-sm group-hover:underline underline-offset-2">
                            {ex.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {[ex.venue, ex.city].filter(Boolean).join(", ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateRange(ex.opening_date, ex.closing_date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Exhibition detail overlay */}
      {selectedExhibition && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
          <button
            onClick={closeExhibition}
            className="fixed top-4 right-4 z-[60] p-2 rounded-full bg-muted hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="max-w-4xl mx-auto px-6 py-16">
            {/* Header */}
            <div className="text-center mb-10 space-y-2">
              <h1 className="font-serif text-3xl font-bold">{selectedExhibition.title}</h1>
              <p className="text-muted-foreground">
                {[selectedExhibition.venue, selectedExhibition.city, selectedExhibition.country].filter(Boolean).join(", ")}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDateRange(selectedExhibition.opening_date, selectedExhibition.closing_date)}
              </p>
              {selectedExhibition.curator && (
                <p className="text-sm text-muted-foreground">Curated by {selectedExhibition.curator}</p>
              )}
              {selectedExhibition.artists && (
                <p className="text-sm text-muted-foreground">{selectedExhibition.artists}</p>
              )}
            </div>

            {selectedExhibition.description && (
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto text-center mb-10 leading-relaxed">
                {selectedExhibition.description}
              </p>
            )}

            {/* Images grid */}
            {loadingImages ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : exhibitionImages.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No installation views available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exhibitionImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="cursor-pointer group/img"
                    onClick={() => setLightboxIndex(idx)}
                  >
                    <div className="aspect-[4/3] bg-muted overflow-hidden">
                      <img
                        src={img.publicUrl}
                        alt={img.caption || selectedExhibition.title}
                        className="w-full h-full object-cover group-hover/img:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                    {img.caption && (
                      <p className="text-[11px] text-muted-foreground mt-1 px-0.5">{img.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen lightbox */}
      {lightboxIndex !== null && exhibitionImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
          >
            <X className="w-5 h-5" />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-4 text-white/70 hover:text-white p-2"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {lightboxIndex < exhibitionImages.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-4 text-white/70 hover:text-white p-2"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={exhibitionImages[lightboxIndex].publicUrl}
              alt={exhibitionImages[lightboxIndex].caption || ""}
              className="max-w-full max-h-[80vh] object-contain"
            />
            <div className="mt-3 text-center">
              {exhibitionImages[lightboxIndex].caption && (
                <p className="text-white/70 text-sm">{exhibitionImages[lightboxIndex].caption}</p>
              )}
              <p className="text-white/40 text-xs mt-1">
                {lightboxIndex + 1} / {exhibitionImages.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </ViewLayout>
  );
};

export default ExhibitionsView;
