import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Shield, LayoutGrid, List, Pencil, Eye, Upload } from "lucide-react";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AddArtworkDialog, type ArtworkDuplicateData } from "@/components/AddArtworkDialog";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { ArtworkCard } from "@/components/ArtworkCard";
import { ArtworkListItem } from "@/components/ArtworkListItem";
import { AppLayout } from "@/components/AppLayout";
import type { User } from "@supabase/supabase-js";

interface Artwork {
  id: string;
  title: string;
  artwork_type: string | null;
  medium: string | null;
  year: number | null;
  dimensions: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  support: string | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  series: string | null;
  is_unique: boolean;
  price: number | null;
  currency: string | null;
  artwork_location: string | null;
  sub_category: string | null;
}

interface ArtworkWithImage {
  id: string;
  title: string;
  artwork_type: string | null;
  medium: string | null;
  year: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  imageUrl: string | null;
}

const formatDimensions = (h: number | null, w: number | null, d: number | null) => {
  const parts = [h, w, d].filter((v) => v != null);
  if (parts.length === 0) return null;
  return parts.join(" × ") + " cm";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [galleryArtworks, setGalleryArtworks] = useState<ArtworkWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState<ArtworkDuplicateData | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editMode, setEditMode] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [globalArtistId, setGlobalArtistId] = useState<number | null>(null);
  const activeRole = (localStorage.getItem("activeRole") as "artist" | "collector" | "registrar") || "artist";
  const idVerified = false;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchArtworks();
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("global_artist_id")
      .eq("user_id", user!.id)
      .single();
    if (data) setGlobalArtistId(data.global_artist_id);
  };

  const fetchArtworks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("artworks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load artworks");
    } else {
      setArtworks(data || []);
      // Build gallery view data with images
      const withImages: ArtworkWithImage[] = await Promise.all(
        (data || []).map(async (art) => {
          const { data: imgs } = await supabase
            .from("artwork_images")
            .select("storage_path")
            .eq("artwork_id", art.id)
            .order("display_order")
            .limit(1);
          let imageUrl: string | null = null;
          if (imgs && imgs.length > 0) {
            const { data: urlData } = supabase.storage
              .from("artwork-images")
              .getPublicUrl(imgs[0].storage_path);
            imageUrl = urlData.publicUrl;
          }
          return {
            id: art.id,
            title: art.title,
            artwork_type: art.artwork_type,
            medium: art.medium,
            year: art.year,
            height: art.height,
            width: art.width,
            depth: art.depth,
            imageUrl,
          };
        })
      );
      setGalleryArtworks(withImages);
    }
    setLoading(false);
  };

  if (!user) return null;

  const headerActions = editMode ? (
    <>
      {globalArtistId && (
        <span className="text-xs px-2 py-0.5 rounded-sm bg-foreground text-background font-mono tracking-wider">
          GAR-{String(globalArtistId).padStart(8, '0')}
        </span>
      )}
      <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "grid" | "list")} size="sm">
        <ToggleGroupItem value="grid" aria-label="Grid view">
          <LayoutGrid className="w-4 h-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="List view">
          <List className="w-4 h-4" />
        </ToggleGroupItem>
      </ToggleGroup>
      <Button variant="outline" onClick={() => setBulkImportOpen(true)} className="gap-2" size="sm">
        <Upload className="w-4 h-4" /> Import
      </Button>
      <Button onClick={() => setDialogOpen(true)} className="gap-2" size="sm">
        <Plus className="w-4 h-4" /> Add Artwork
      </Button>
      <Button variant="outline" size="sm" onClick={() => setEditMode(false)} className="gap-1.5">
        <Eye className="w-4 h-4" /> Done
      </Button>
    </>
  ) : (
    <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
      <Pencil className="w-3.5 h-3.5" /> Edit
    </Button>
  );

  return (
    <AppLayout
      title={activeRole === "artist" ? "Catalogue Raisonné" : activeRole === "collector" ? "Collection" : "Managed Artworks"}
      headerActions={headerActions}
    >
      {editMode ? (
        <div className="max-w-6xl mx-auto px-6 py-8">
          {!idVerified && (
            <div className="flex items-center gap-3 p-4 mb-8 rounded-sm border border-border bg-secondary">
              <Shield className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Identity verification required</p>
                <p className="text-xs text-muted-foreground">
                  Complete government-approved ID verification to add artworks to your database.
                </p>
              </div>
              <Button size="sm" variant="outline" disabled>Verify ID</Button>
            </div>
          )}

          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              {artworks.length} artwork{artworks.length !== 1 ? "s" : ""} documented
            </p>
          </div>

          {loading ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-[3/4] bg-secondary animate-pulse rounded-sm" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-secondary animate-pulse rounded-sm" />
                ))}
              </div>
            )
          ) : artworks.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-4">No artworks yet</p>
              <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add your first artwork
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {artworks.map((artwork) => (
                <ArtworkCard key={artwork.id} artwork={artwork} onDuplicate={(data) => { setDuplicateData(data); setDialogOpen(true); }} />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {artworks.map((artwork) => (
                <ArtworkListItem key={artwork.id} artwork={artwork} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Gallery presentation view */
        <div className="max-w-5xl mx-auto px-6 py-10">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[3/4] bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : galleryArtworks.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No artworks yet.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditMode(true)}>
                Add artworks
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {galleryArtworks.map((art) => (
                <div
                  key={art.id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/artwork/${art.id}/view`)}
                >
                  <div className="aspect-[3/4] bg-secondary rounded-sm overflow-hidden mb-3">
                    {art.imageUrl ? (
                      <img
                        src={art.imageUrl}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium italic">{art.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    {art.year && <span>{art.year}</span>}
                    {art.year && art.medium && <span>·</span>}
                    {art.medium && <span className="truncate">{art.medium}</span>}
                  </div>
                  {formatDimensions(art.height, art.width, art.depth) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDimensions(art.height, art.width, art.depth)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AddArtworkDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setDuplicateData(null); }}
        onSuccess={fetchArtworks}
        userRole={userRole}
        initialData={duplicateData}
      />

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onSuccess={fetchArtworks}
      />
    </AppLayout>
  );
};

export default Dashboard;
