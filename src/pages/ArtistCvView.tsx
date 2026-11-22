import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { ViewLayout } from "@/components/ViewLayout";
import { CvPdfButton } from "@/components/CvPdfButton";
import { buildCvSections, CvSection } from "@/hooks/use-cv-with-exhibitions";

const ArtistCvView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [artistName, setArtistName] = useState("");
  const [cvSections, setCvSections] = useState<CvSection[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("user_id", session.user.id)
        .single();

      if (!profile) { setLoading(false); return; }

      setArtistName(profile.full_name || "Artist");

      const sections = await buildCvSections(profile.id, session.user.id);
      setCvSections(sections);

      setLoading(false);
    };
    load();
  }, [navigate]);


  if (loading) {
    return (
      <ViewLayout editPath="/profile">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading CV…</p>
        </div>
      </ViewLayout>
    );
  }

  const headerActions = (
    <CvPdfButton artistName={artistName} sections={cvSections} label="Download PDF" />
  );

  return (
    <ViewLayout editPath="/profile">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {cvSections.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No CV entries yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate("/profile")}
            >
              Add CV entries
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <h1 className="text-3xl sm:text-4xl">{artistName}</h1>
              <p className="text-sm text-muted-foreground tracking-widest uppercase mt-2">
                Curriculum Vitae
              </p>
            </div>

            {/* Printable content */}
            <div ref={printRef} className="space-y-10">
              {cvSections.map((s, si) => (
                <div key={si}>
                  <h2 className="text-xl mb-5 pb-2 border-b border-border">{s.section}</h2>
                  <div className="space-y-3">
                    {s.entries.map((entry, ei) => (
                      <div key={ei} className="entry flex gap-4">
                        {entry.year && (
                          <span className="year text-sm text-muted-foreground font-mono w-16 shrink-0 pt-0.5">
                            {entry.year}
                          </span>
                        )}
                        <div className="text flex-1">
                          <p className="text-sm text-foreground/80 leading-relaxed">{entry.entry_text}</p>
                          {entry.images.length > 0 && (
                            <div className="images flex gap-2 mt-2 flex-wrap">
                              {entry.images.map((img, ii) => {
                                const { data } = supabase.storage
                                  .from("cv-images")
                                  .getPublicUrl(img.storage_path);
                                return (
                                  <img
                                    key={ii}
                                    src={data.publicUrl}
                                    alt={img.caption || ""}
                                    className="w-20 h-20 object-cover rounded border border-border"
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ViewLayout>
  );
};

export default ArtistCvView;
