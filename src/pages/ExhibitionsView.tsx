import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ViewLayout } from "@/components/ViewLayout";
import { Loader2, Star } from "lucide-react";

interface ExhibitionWithImage {
  id: string;
  title: string;
  exhibition_type: string;
  opening_date: string | null;
  closing_date: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  mainImageUrl: string | null;
}

const ExhibitionsView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exhibitions, setExhibitions] = useState<ExhibitionWithImage[]>([]);
  const [filter, setFilter] = useState<"all" | "solo" | "group">("all");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data: exs } = await supabase
        .from("exhibitions")
        .select("id, title, exhibition_type, opening_date, closing_date, venue, city, country")
        .eq("user_id", session.user.id)
        .order("opening_date", { ascending: false });

      if (!exs?.length) { setExhibitions([]); setLoading(false); return; }

      // Fetch main images (display_order = 0) for all exhibitions
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

  const filtered = filter === "all"
    ? exhibitions
    : exhibitions.filter(e => e.exhibition_type === filter);

  // Group by year
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
            {/* Vertical timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border hidden md:block" />

            {years.map((year) => {
              const yearExhibitions = grouped.get(year)!;
              return (
                <div key={year} className="mb-12">
                  <h2 className="font-serif text-3xl font-bold mb-6">{year}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                    {yearExhibitions.map((ex) => (
                      <div key={ex.id} className="group">
                        {/* Image */}
                        {ex.mainImageUrl ? (
                          <div className="relative aspect-[4/3] bg-muted mb-3 overflow-hidden">
                            <img
                              src={ex.mainImageUrl}
                              alt={ex.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute top-2 left-2">
                              <Star className="w-4 h-4 fill-foreground text-background" />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-[4/3] bg-muted mb-3 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">No image</span>
                          </div>
                        )}
                        {/* Info */}
                        <div className="text-center space-y-0.5">
                          <h3 className="font-semibold text-sm underline underline-offset-2">
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
    </ViewLayout>
  );
};

export default ExhibitionsView;
