import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

interface SeriesGroup {
  id: string;
  name: string;
  created_at: string;
}

const Series = () => {
  const navigate = useNavigate();
  const [series, setSeries] = useState<SeriesGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      fetchSeries();
    };
    init();
  }, [navigate]);

  const fetchSeries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("series_groups")
      .select("*")
      .order("name");
    if (error) toast.error("Failed to load series");
    else setSeries(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAdding(false); return; }

    const { error } = await supabase.from("series_groups").insert({ user_id: user.id, name });
    if (error) {
      if (error.code === "23505") toast.error("Series already exists");
      else toast.error("Failed to add series");
    } else {
      toast.success("Series added");
      setNewName("");
      fetchSeries();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from("series_groups").delete().eq("id", id);
    if (error) toast.error("Failed to delete series");
    else {
      toast.success(`"${name}" deleted`);
      setSeries((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const headerActions = editMode ? (
    <Button variant="outline" size="sm" onClick={() => setEditMode(false)} className="gap-1.5">
      <Eye className="w-4 h-4" /> Done
    </Button>
  ) : (
    <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
      <Pencil className="w-3.5 h-3.5" /> Edit
    </Button>
  );

  return (
    <AppLayout title="Series" headerActions={headerActions}>
      {editMode ? (
        <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
          <p className="text-sm text-muted-foreground">
            Manage the series and groups used to organize your artworks. These appear as options when registering new works.
          </p>

          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New series name"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            />
            <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : series.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No series created yet.</p>
          ) : (
            <div className="space-y-1">
              {series.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-border hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-sm font-medium">{s.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(s.id, s.name)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* View mode – clean presentation */
        <div className="max-w-xl mx-auto px-6 py-10">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 w-48 bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : series.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No series yet.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditMode(true)}>
                Add series
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {series.map((s) => (
                <li key={s.id} className="text-sm font-medium">{s.name}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default Series;
