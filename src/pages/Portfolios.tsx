import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, FolderOpen, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

interface Portfolio {
  id: string;
  name: string;
  share_token: string;
  created_at: string;
  artwork_count?: number;
}

const Portfolios = () => {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      fetchPortfolios();
    };
    init();
  }, [navigate]);

  const fetchPortfolios = async () => {
    setLoading(true);
    const activeRole = localStorage.getItem("activeRole") || "artist";
    const { data, error } = await supabase
      .from("portfolios")
      .select("id, name, share_token, created_at")
      .eq("role_context", activeRole)
      .order("created_at", { ascending: false });

    if (error) { toast.error("Failed to load portfolios"); setLoading(false); return; }

    // Get artwork counts
    const withCounts: Portfolio[] = await Promise.all(
      (data || []).map(async (p) => {
        const { count } = await supabase
          .from("portfolio_artworks")
          .select("id", { count: "exact", head: true })
          .eq("portfolio_id", p.id);
        return { ...p, artwork_count: count || 0 };
      })
    );
    setPortfolios(withCounts);
    setLoading(false);
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAdding(false); return; }

    const activeRole = localStorage.getItem("activeRole") || "artist";
    const { error } = await supabase.from("portfolios").insert({ user_id: user.id, name, role_context: activeRole } as any);
    if (error) { toast.error("Failed to create portfolio"); }
    else { toast.success("Portfolio created"); setNewName(""); fetchPortfolios(); }
    setAdding(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from("portfolios").delete().eq("id", id);
    if (error) toast.error("Failed to delete portfolio");
    else {
      toast.success(`"${name}" deleted`);
      setPortfolios((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/portfolio/shared/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard");
  };

  return (
    <AppLayout title="Portfolios">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <p className="text-sm text-muted-foreground">
          Create temporary folders of selected works to share with galleries, collectors, or contacts via a unique link.
        </p>

        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Portfolio name"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          />
          <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Create
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-secondary animate-pulse rounded-sm" />
            ))}
          </div>
        ) : portfolios.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No portfolios yet.</p>
        ) : (
          <div className="space-y-2">
            {portfolios.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 rounded-sm border border-border hover:bg-secondary/50 transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                <button
                  className="flex-1 text-left"
                  onClick={() => navigate(`/portfolio/${p.id}`)}
                >
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {p.artwork_count} work{p.artwork_count !== 1 ? "s" : ""}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyShareLink(p.share_token)}
                  className="h-8 w-8"
                  title="Copy share link"
                >
                  <LinkIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(p.id, p.name)}
                  className="h-8 w-8"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Portfolios;
