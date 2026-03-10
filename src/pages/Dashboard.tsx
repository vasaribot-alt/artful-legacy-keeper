import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import { AddArtworkDialog } from "@/components/AddArtworkDialog";
import { ArtworkCard } from "@/components/ArtworkCard";
import type { User } from "@supabase/supabase-js";

interface Artwork {
  id: string;
  title: string;
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
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [globalArtistId, setGlobalArtistId] = useState<number | null>(null);
  const userRole = user?.user_metadata?.role || "artist";
  const userName = user?.user_metadata?.full_name || "User";
  const idVerified = false; // Placeholder for ID verification status

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
        return;
      }
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
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Global Artist Registry Foundation</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{userName}</span>
            {globalArtistId && (
              <span className="text-xs px-2 py-0.5 rounded-sm bg-foreground text-background font-mono tracking-wider">
                ID {globalArtistId}
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-sm bg-secondary text-secondary-foreground uppercase tracking-wider">
              {userRole}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* ID Verification Banner */}
        {!idVerified && (
          <div className="flex items-center gap-3 p-4 mb-8 rounded-sm border border-border bg-surface">
            <Shield className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Identity verification required</p>
              <p className="text-xs text-muted-foreground">
                Complete government-approved ID verification to add artworks to your database.
              </p>
            </div>
            <Button size="sm" variant="outline" disabled>
              Verify ID
            </Button>
          </div>
        )}

        {/* Title + Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl">
              {userRole === "artist" ? "Catalogue Raisonné" : userRole === "collector" ? "Collection" : "Managed Artworks"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {artworks.length} artwork{artworks.length !== 1 ? "s" : ""} documented
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Artwork
          </Button>
        </div>

        {/* Artworks Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] bg-secondary animate-pulse rounded-sm" />
            ))}
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No artworks yet</p>
            <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add your first artwork
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artworks.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        )}
      </main>

      <AddArtworkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchArtworks}
      />
    </div>
  );
};

export default Dashboard;
