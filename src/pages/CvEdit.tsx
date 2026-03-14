import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import CvManager from "@/components/CvManager";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Pencil, Eye } from "lucide-react";
import { buildCvSections, CvSection } from "@/hooks/use-cv-with-exhibitions";

const CvEdit = () => {
  const navigate = useNavigate();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [artistName, setArtistName] = useState("");
  const [cvSections, setCvSections] = useState<CvSection[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [generating, setGenerating] = useState(false);
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

  const handleDownloadPdf = async () => {
    setGenerating(true);
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) throw new Error("Popup blocked");
      const content = printRef.current?.innerHTML || "";
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>CV — ${artistName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'DM Sans', system-ui, sans-serif; color: #111; padding: 48px; max-width: 800px; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            h1 { font-family: 'DM Serif Display', serif; font-size: 28px; margin-bottom: 8px; letter-spacing: -0.01em; }
            .subtitle { font-size: 13px; color: #666; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 0.1em; }
            h2 { font-family: 'DM Serif Display', serif; font-size: 18px; margin-bottom: 16px; margin-top: 32px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5; letter-spacing: -0.01em; }
            .entry { display: flex; gap: 16px; margin-bottom: 8px; page-break-inside: avoid; }
            .year { font-family: monospace; font-size: 13px; color: #888; width: 60px; flex-shrink: 0; padding-top: 1px; }
            .text { font-size: 14px; color: #333; line-height: 1.5; flex: 1; }
            .images { display: none; }
            @media print { body { padding: 24px; } h2 { margin-top: 24px; } }
          </style>
        </head>
        <body>
          <h1>${artistName}</h1>
          <p class="subtitle">Curriculum Vitae</p>
          ${content}
          <script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 300); };</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch {
      window.print();
    } finally {
      setGenerating(false);
    }
  };

  const handleExitEdit = () => {
    setEditMode(false);
    loadData(); // Refresh CV data after editing
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
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadPdf}
        disabled={generating || cvSections.length === 0}
        className="gap-1.5"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
        <Pencil className="w-3.5 h-3.5" /> Edit
      </Button>
    </>
  );

  return (
    <AppLayout title="CV" headerActions={headerActions}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {editMode && profileId ? (
          <CvManager profileId={profileId} />
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
