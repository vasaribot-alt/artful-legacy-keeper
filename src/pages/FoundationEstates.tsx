import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Row {
  id: string;
  artist_id: string;
  successor_name: string;
  successor_email: string;
  relationship: string | null;
  notes: string | null;
  estate_display_name: string | null;
  status: string;
  named_at: string;
  activated_at: string | null;
  artist_name?: string | null;
  artist_gar?: number | null;
}

export default function FoundationEstates() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Row | null>(null);
  const [deathYear, setDeathYear] = useState("");
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("estate_successors")
      .select("*")
      .order("named_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data as Row[]) || [];
    const ids = Array.from(new Set(list.map((r) => r.artist_id)));
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, global_artist_id")
        .in("user_id", ids);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      list.forEach((r) => {
        const p = map.get(r.artist_id);
        r.artist_name = p?.full_name ?? null;
        r.artist_gar = p?.global_artist_id ?? null;
      });
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activate = async () => {
    if (!active) return;
    setWorking(true);
    const { error } = await supabase.rpc("activate_estate_succession", {
      _successor_id: active.id,
      _death_year: deathYear.trim() ? parseInt(deathYear, 10) : null,
    });
    setWorking(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Estate custodianship activated");
    setActive(null);
    setDeathYear("");
    load();
  };

  return (
    <AppLayout title="Estate Succession">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <header>
          <h1 className="text-2xl">Estate Succession</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Successors named by artists. Hand an archive over only after you have seen proof such as
            a death certificate or a letter from the executor.
          </p>
        </header>

        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No successors named yet.</p>
        ) : (
          <div className="border border-border rounded-sm divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.artist_name || "Unnamed artist"}</span>
                    {r.artist_gar && (
                      <span className="text-xs font-mono text-muted-foreground">
                        GAR-{String(r.artist_gar).padStart(8, "0")}
                      </span>
                    )}
                    <Badge variant={r.status === "activated" ? "default" : "outline"} className="text-xs">
                      {r.status === "activated" ? "Active custodian" : r.status === "revoked" ? "Withdrawn" : "Named"}
                    </Badge>
                  </div>
                  <p className="text-sm mt-1">
                    {r.successor_name}
                    {r.relationship ? ` · ${r.relationship}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground break-all">{r.successor_email}</p>
                  {r.estate_display_name && (
                    <p className="text-sm text-muted-foreground">Estate name: {r.estate_display_name}</p>
                  )}
                  {r.notes && <p className="text-sm text-muted-foreground mt-1">{r.notes}</p>}
                </div>
                {r.status !== "activated" && (
                  <Button variant="outline" size="sm" onClick={() => setActive(r)}>
                    Hand over
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hand the archive over</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {active?.successor_name} will be able to manage {active?.artist_name}'s archive in
              full. The public pages will show that the archive is looked after by the estate.
            </p>
            <div className="space-y-2">
              <Label>Year of death (optional)</Label>
              <Input
                value={deathYear}
                onChange={(e) => setDeathYear(e.target.value)}
                placeholder="2026"
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The successor must already have an account with the same email address, otherwise ask
              them to register first and then hand over.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={activate} disabled={working}>
              {working ? "Working…" : "Confirm handover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
