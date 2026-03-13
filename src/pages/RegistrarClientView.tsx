import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Images, Calendar, BookOpen, Upload } from "lucide-react";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClientProfile {
  full_name: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
}

interface ClientArtwork {
  id: string;
  title: string;
  year: number | null;
  medium: string | null;
  imageUrl: string | null;
}

const RegistrarClientView = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [artworks, setArtworks] = useState<ClientArtwork[]>([]);
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const [catalogues, setCatalogues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("artworks");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  useEffect(() => {
    if (!ownerId) return;
    fetchClientData();
  }, [ownerId]);

  const fetchClientData = async () => {
    setLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, email, city, country")
      .eq("user_id", ownerId!)
      .single();
    setProfile(profileData);

    // Fetch artworks with images
    const { data: artworksData } = await supabase
      .from("artworks")
      .select("id, title, year, medium")
      .eq("owner_id", ownerId!)
      .order("created_at", { ascending: false });

    const withImages: ClientArtwork[] = await Promise.all(
      (artworksData || []).map(async (art) => {
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
        return { ...art, imageUrl };
      })
    );
    setArtworks(withImages);

    // Fetch exhibitions
    const { data: exhibitionsData } = await supabase
      .from("exhibitions")
      .select("*")
      .eq("user_id", ownerId!)
      .order("opening_date", { ascending: false });
    setExhibitions(exhibitionsData || []);

    // Fetch catalogues
    const { data: cataloguesData } = await supabase
      .from("catalogues")
      .select("*")
      .eq("user_id", ownerId!)
      .order("created_at", { ascending: false });
    setCatalogues(cataloguesData || []);

    setLoading(false);
  };

  return (
    <AppLayout
      title={profile?.full_name || "Client"}
      headerActions={
        <>
          <Button variant="outline" size="sm" onClick={() => setBulkImportOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> All Clients
          </Button>
        </>
      }
    >
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Client info bar */}
        {profile && (
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
            <div>
              <h2 className="text-lg font-medium">{profile.full_name}</h2>
              <p className="text-xs text-muted-foreground">
                {[profile.city, profile.country].filter(Boolean).join(", ") || profile.email}
              </p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="artworks" className="gap-1.5">
              <Images className="w-3.5 h-3.5" /> Artworks ({artworks.length})
            </TabsTrigger>
            <TabsTrigger value="exhibitions" className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Exhibitions ({exhibitions.length})
            </TabsTrigger>
            <TabsTrigger value="catalogues" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Catalogues ({catalogues.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artworks" className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="aspect-[3/4] bg-secondary animate-pulse rounded-sm" />
                ))}
              </div>
            ) : artworks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No artworks yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {artworks.map((art) => (
                  <div
                    key={art.id}
                    className="group cursor-pointer"
                    onClick={() => navigate(`/artwork/${art.id}`)}
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
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="exhibitions" className="mt-6">
            {exhibitions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No exhibitions yet.</p>
            ) : (
              <div className="space-y-3">
                {exhibitions.map((ex) => (
                  <div key={ex.id} className="p-4 rounded-sm border border-border">
                    <p className="text-sm font-medium">{ex.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[ex.venue, ex.city, ex.country].filter(Boolean).join(", ")}
                      {ex.opening_date && ` · ${ex.opening_date}`}
                    </p>
                    <span className="text-xs text-muted-foreground capitalize">{ex.exhibition_type}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="catalogues" className="mt-6">
            {catalogues.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No catalogues yet.</p>
            ) : (
              <div className="space-y-3">
                {catalogues.map((cat) => (
                  <div key={cat.id} className="p-4 rounded-sm border border-border">
                    <p className="text-sm font-medium">{cat.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[cat.publisher, cat.publication_year].filter(Boolean).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default RegistrarClientView;
