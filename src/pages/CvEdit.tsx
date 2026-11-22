import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import CvManager from "@/components/CvManager";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Pencil, Eye } from "lucide-react";
import { CvPdfButton } from "@/components/CvPdfButton";
import { buildCvSections, CvSection } from "@/hooks/use-cv-with-exhibitions";

const CvEdit = () => {
  const navigate = useNavigate();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [artistName, setArtistName] = useState("");
  const [cvSections, setCvSections] = useState<CvSection[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [cvDirty, setCvDirty] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("user_id", session.user.id)
      .single();

    if (!profile) { setLoading(false); return; }

    setProfileId(profile.id);
    setArtistName(profile.full_name || "Artist");

    const sections = await buildCvSections(profile.id, session.user.id);
    setCvSections(sections);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [navigate]);


  const handleExitEdit = () => {
    if (cvDirty) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to exit without saving?");
      if (!confirmed) return;
    }
    setCvDirty(false);
    setEditMode(false);
    loadData();
  };

  if (loading) {
    return (
      <AppLayout title="CV">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  const headerActions = editMode ? (
    <Button variant="outline" size="sm" onClick={handleExitEdit} className="gap-1.5">
      <Eye className="w-4 h-4" /> Done Editing
    </Button>
  ) : (
    <>
      <CvPdfButton artistName={artistName} sections={cvSections} label="PDF" />
      <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
        <Pencil className="w-3.5 h-3.5" /> Edit
      </Button>
    </>
  );

  return (
    <AppLayout title="CV" headerActions={headerActions}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {editMode && profileId ? (
          <CvManager profileId={profileId} onDirtyChange={setCvDirty} />
        ) : cvSections.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No CV entries yet.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditMode(true)}>
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
    </AppLayout>
  );
};

export default CvEdit;
