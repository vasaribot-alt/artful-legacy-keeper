import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { ViewLayout } from "@/components/ViewLayout";

interface CvEntry {
  section: string;
  year: string;
  entry_text: string;
  images: { storage_path: string; caption: string | null }[];
}

interface CvSection {
  section: string;
  entries: CvEntry[];
}

const ArtistCvView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [artistName, setArtistName] = useState("");
  const [cvSections, setCvSections] = useState<CvSection[]>([]);
  const [generating, setGenerating] = useState(false);
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

      const { data: entries } = await supabase
        .from("cv_entries")
        .select("*, cv_entry_images(*)")
        .eq("profile_id", profile.id)
        .order("display_order", { ascending: true });

      if (entries && entries.length > 0) {
        const sectionMap = new Map<string, CvEntry[]>();
        for (const e of entries) {
          const section = e.section || "Other";
          if (!sectionMap.has(section)) sectionMap.set(section, []);
          sectionMap.get(section)!.push({
            section,
            year: e.year || "",
            entry_text: e.entry_text || "",
            images: ((e as any).cv_entry_images || []).map((img: any) => ({
              storage_path: img.storage_path,
              caption: img.caption,
            })),
          });
        }
        setCvSections(
          Array.from(sectionMap.entries()).map(([section, entries]) => ({ section, entries }))
        );
      }

      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleDownloadPdf = async () => {
    setGenerating(true);
    try {
      // Use browser print to PDF
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error("Popup blocked");
      }

      const content = printRef.current?.innerHTML || "";

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>CV — ${artistName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
              font-family: 'DM Sans', system-ui, sans-serif;
              color: #111;
              padding: 48px;
              max-width: 800px;
              margin: 0 auto;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            h1 {
              font-family: 'DM Serif Display', serif;
              font-size: 28px;
              margin-bottom: 8px;
              letter-spacing: -0.01em;
            }
            
            .subtitle {
              font-size: 13px;
              color: #666;
              margin-bottom: 40px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            
            h2 {
              font-family: 'DM Serif Display', serif;
              font-size: 18px;
              margin-bottom: 16px;
              margin-top: 32px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e5e5e5;
              letter-spacing: -0.01em;
            }
            
            .entry {
              display: flex;
              gap: 16px;
              margin-bottom: 8px;
              page-break-inside: avoid;
            }
            
            .year {
              font-family: monospace;
              font-size: 13px;
              color: #888;
              width: 60px;
              flex-shrink: 0;
              padding-top: 1px;
            }
            
            .text {
              font-size: 14px;
              color: #333;
              line-height: 1.5;
              flex: 1;
            }

            .images { display: none; }

            @media print {
              body { padding: 24px; }
              h2 { margin-top: 24px; }
            }
          </style>
        </head>
        <body>
          <h1>${artistName}</h1>
          <p class="subtitle">Curriculum Vitae</p>
          ${content}
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); window.close(); }, 300);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch {
      // Fallback: just print current window
      window.print();
    } finally {
      setGenerating(false);
    }
  };

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
    <Button
      size="sm"
      variant="outline"
      onClick={handleDownloadPdf}
      disabled={generating || cvSections.length === 0}
      className="gap-1.5"
    >
      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      Download PDF
    </Button>
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
