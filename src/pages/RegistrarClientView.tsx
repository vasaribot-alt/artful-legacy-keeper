import { useEffect, useState } from "react";
import { useParams, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { exportArtworksToArtlogic } from "@/lib/artlogicExport";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { AddArtworkDialog } from "@/components/AddArtworkDialog";
import { RegistrarWorkspaceLayout } from "@/components/RegistrarWorkspaceLayout";
import { useActiveOwner } from "@/hooks/use-active-owner";
import Exhibitions from "@/pages/Exhibitions";
import Catalogues from "@/pages/Catalogues";
import { CommitteeInbox, CommitteeSubmissionDetail } from "@/pages/CommitteeReview";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { ResearchWorkspace } from "@/components/ResearchWorkspace";


interface ClientArtwork {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
  imageUrl: string | null;
}

// ──────────────── ARTWORKS SECTION ────────────────
function ArtworksSection({ ownerId, clientRole }: { ownerId: string; clientRole: "artist" | "collector" }) {
  const navigate = useNavigate();
  const [artworks, setArtworks] = useState<ClientArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  useScrollRestoration("registrar-client-artworks", !loading);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const fetchArtworks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("artworks")
      .select("id, title, year, medium")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    const withImages: ClientArtwork[] = await Promise.all(
      (data || []).map(async (art) => {
        const { data: imgs } = await supabase
          .from("artwork_images")
          .select("storage_path")
          .eq("artwork_id", art.id)
          .order("display_order")
          .limit(1);
        let imageUrl: string | null = null;
        if (imgs && imgs.length > 0) {
          const { data: urlData } = supabase.storage.from("artwork-images").getPublicUrl(imgs[0].storage_path);
          imageUrl = urlData.publicUrl;
        }
        return { ...art, imageUrl };
      })
    );
    setArtworks(withImages);
    setLoading(false);
  };

  useEffect(() => { fetchArtworks(); }, [ownerId]);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (artworks.length === 0) {
      toast.error("No artworks to export");
      return;
    }
    setExporting(true);
    try {
      const { count, filename } = await exportArtworksToArtlogic({
        artworkIds: artworks.map((a) => a.id),
        filenameBase: "",
      });
      toast.success(`Exported ${count} work${count === 1 ? "" : "s"} to ${filename}`);
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <RegistrarWorkspaceLayout
      headerActions={
        <>
          <Button variant="default" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} className="gap-1.5 h-8">
            <Upload className="w-3.5 h-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5 h-8">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </>
      }
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="aspect-[3/4] bg-secondary animate-pulse rounded-sm" />)}
          </div>
        ) : artworks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No artworks yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artworks.map((art) => (
              <div key={art.id} className="group cursor-pointer" onClick={() => navigate(`/artwork/${art.id}`)}>
                <div className="aspect-[3/4] bg-secondary rounded-sm overflow-hidden mb-3">
                  {art.imageUrl ? (
                    <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" loading="lazy" />
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
              </div>
            ))}
          </div>
        )}
      </div>

      <BulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} onSuccess={fetchArtworks} ownerId={ownerId} userRole={clientRole} />
      <AddArtworkDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchArtworks} ownerId={ownerId} roleContext={clientRole} userRole={clientRole} />
    </RegistrarWorkspaceLayout>
  );
}

// ──────────────── GENERIC LIST SECTION (Exhibitions / Catalogues) ────────────────
function SimpleListSection({
  ownerId,
  table,
  emptyText,
  renderItem,
  orderBy,
}: {
  ownerId: string;
  table: "exhibitions" | "catalogues" | "portfolios" | "series_groups";
  emptyText: string;
  renderItem: (row: any) => React.ReactNode;
  orderBy: { column: string; ascending: boolean };
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const ownerCol = table === "exhibitions" || table === "catalogues" || table === "portfolios" || table === "series_groups" ? "user_id" : "user_id";
      const { data } = await supabase.from(table).select("*").eq(ownerCol, ownerId).order(orderBy.column, { ascending: orderBy.ascending });
      setRows(data || []);
      setLoading(false);
    })();
  }, [ownerId, table]);

  return (
    <RegistrarWorkspaceLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-secondary animate-pulse rounded-sm" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">{emptyText}</p>
        ) : (
          <div className="space-y-3">{rows.map(renderItem)}</div>
        )}
      </div>
    </RegistrarWorkspaceLayout>
  );
}

// ──────────────── PROFILE SECTION ────────────────
function ProfileSection({ ownerId }: { ownerId: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", ownerId).maybeSingle();
      setProfile(data);
      setLoading(false);
    })();
  }, [ownerId]);

  return (
    <RegistrarWorkspaceLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {loading ? (
          <div className="h-32 bg-secondary animate-pulse rounded-sm" />
        ) : profile ? (
          <>
            <div className="space-y-1">
              <h2 className="text-2xl font-serif">{profile.full_name || "Untitled"}</h2>
              <p className="text-sm text-muted-foreground">{[profile.city, profile.country].filter(Boolean).join(", ")}</p>
            </div>
            {profile.verification_status === "pending" && (
              <div className="rounded-sm border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                Profile changes are pending the client's review.
              </div>
            )}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Email</dt><dd>{profile.email || "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Phone</dt><dd>{profile.phone ? `${profile.phone_prefix || ""} ${profile.phone}` : "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Birth year</dt><dd>{profile.birth_year || "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Website</dt><dd className="truncate">{profile.website || "—"}</dd></div>
            </dl>
            {profile.biography && (
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Biography</dt>
                <dd className="text-sm whitespace-pre-line">{profile.biography}</dd>
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-4 border-t border-border">
              Editing the client profile from the registrar workspace is coming soon. For now, this is a read-only view.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No profile found.</p>
        )}
      </div>
    </RegistrarWorkspaceLayout>
  );
}

// ──────────────── PLACEHOLDER SECTION ────────────────
function PlaceholderSection({ title, message }: { title: string; message: string }) {
  return (
    <RegistrarWorkspaceLayout>
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-xl font-serif mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </RegistrarWorkspaceLayout>
  );
}

// ──────────────── ROOT ────────────────
const RegistrarClientView = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const { clientRole, loading } = useActiveOwner();

  if (!ownerId) return <Navigate to="/registrar" replace />;
  if (loading) return <div className="min-h-screen bg-background" />;

  return (
    <Routes>
      <Route index element={<ArtworksSection ownerId={ownerId} clientRole={clientRole} />} />
      <Route path="artworks" element={<ArtworksSection ownerId={ownerId} clientRole={clientRole} />} />
      <Route path="profile" element={<ProfileSection ownerId={ownerId} />} />
      <Route path="exhibitions" element={<Exhibitions />} />
      <Route path="catalogues" element={<Catalogues />} />
      <Route
        path="portfolios"
        element={
          <SimpleListSection
            ownerId={ownerId}
            table="portfolios"
            emptyText="No portfolios yet."
            orderBy={{ column: "created_at", ascending: false }}
            renderItem={(p) => (
              <div key={p.id} className="p-4 rounded-sm border border-border">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{p.role_context}</p>
              </div>
            )}
          />
        }
      />
      <Route
        path="series"
        element={
          <SimpleListSection
            ownerId={ownerId}
            table="series_groups"
            emptyText="No series yet."
            orderBy={{ column: "created_at", ascending: false }}
            renderItem={(s) => (
              <div key={s.id} className="p-4 rounded-sm border border-border">
                <p className="text-sm font-medium">{s.name}</p>
              </div>
            )}
          />
        }
      />
      <Route
        path="research"
        element={
          <RegistrarWorkspaceLayout>
            <div className="max-w-5xl mx-auto px-6 py-8">
              <h2 className="text-2xl font-serif mb-4">Research workspace</h2>
              <ResearchWorkspace ownerId={ownerId} asRegistrar />
            </div>
          </RegistrarWorkspaceLayout>
        }
      />
      <Route path="committee" element={<CommitteeInbox />} />
      <Route path="committee/:submissionId" element={<CommitteeSubmissionDetail />} />

      <Route path="inventory" element={<PlaceholderSection title="Inventory" message="Client-scoped inventory view is coming soon." />} />
      <Route path="cv" element={<PlaceholderSection title="CV" message="Client-scoped CV editing is coming soon." />} />
      <Route path="provenance" element={<PlaceholderSection title="Provenance" message="Client-scoped provenance is coming soon." />} />
      <Route path="*" element={<Navigate to="artworks" replace />} />
    </Routes>
  );
};

export default RegistrarClientView;
