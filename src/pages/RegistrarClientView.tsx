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
import { ClientDocuments } from "@/components/registrar/ClientDocuments";
import CvManager from "@/components/CvManager";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


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

  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setProfile((p: any) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const by = profile.birth_year ? parseInt(String(profile.birth_year), 10) : null;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name?.trim() || null,
        city: profile.city?.trim() || null,
        country: profile.country?.trim() || null,
        phone_prefix: profile.phone_prefix?.trim() || null,
        phone: profile.phone?.trim() || null,
        birth_year: Number.isFinite(by as number) ? by : null,
        website: profile.website?.trim() || null,
        biography: profile.biography || null,
      } as any)
      .eq("user_id", ownerId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const field = (label: string, key: string, type = "text") => (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type={type} autoComplete="off" value={profile[key] ?? ""} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  return (
    <RegistrarWorkspaceLayout
      headerActions={profile ? (
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-8">
          {saving ? "Saving…" : "Save"}
        </Button>
      ) : undefined}
    >
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {loading ? (
          <div className="h-32 bg-secondary animate-pulse rounded-sm" />
        ) : profile ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("Full name", "full_name")}
              {field("Birth year", "birth_year", "number")}
              {field("City", "city")}
              {field("Country", "country")}
              {field("Phone prefix", "phone_prefix")}
              {field("Phone", "phone")}
              {field("Website", "website")}
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input value={profile.email ?? ""} disabled />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Biography</Label>
              <Textarea rows={10} value={profile.biography ?? ""} onChange={(e) => set("biography", e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground pt-4 border-t border-border">
              Changes are saved to the client's account. Email can only be changed by the client.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No profile found.</p>
        )}
      </div>
    </RegistrarWorkspaceLayout>
  );
}

// ──────────────── CV SECTION ────────────────
function CvSection({ ownerId }: { ownerId: string }) {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id").eq("user_id", ownerId).maybeSingle();
      setProfileId(data?.id ?? null);
      setLoading(false);
    })();
  }, [ownerId]);
  return (
    <RegistrarWorkspaceLayout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {loading ? (
          <div className="h-32 bg-secondary animate-pulse rounded-sm" />
        ) : profileId ? (
          <CvManager profileId={profileId} />
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

      <Route path="documents" element={<ClientDocuments ownerId={ownerId} clientRole={clientRole} />} />
      <Route path="inventory" element={<PlaceholderSection title="Inventory" message="Client-scoped inventory view is coming soon." />} />
      <Route path="cv" element={<CvSection ownerId={ownerId!} />} />
      <Route path="provenance" element={<PlaceholderSection title="Provenance" message="Client-scoped provenance is coming soon." />} />
      <Route path="*" element={<Navigate to="artworks" replace />} />
    </Routes>
  );
};

export default RegistrarClientView;
