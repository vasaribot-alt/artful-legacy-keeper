import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface Successor {
  id: string;
  successor_name: string;
  successor_email: string;
  relationship: string | null;
  notes: string | null;
  estate_display_name: string | null;
  status: string;
  named_at: string;
  activated_at: string | null;
}

export function EstateSuccessorManager() {
  const [rows, setRows] = useState<Successor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [estateName, setEstateName] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("estate_successors")
      .select("id, successor_name, successor_email, relationship, notes, estate_display_name, status, named_at, activated_at")
      .eq("artist_id", user.id)
      .order("named_at", { ascending: false });
    setRows((data as Successor[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Please add a name and an email address");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("estate_successors").insert({
      artist_id: user.id,
      successor_name: name.trim(),
      successor_email: email.trim(),
      relationship: relationship.trim() || null,
      estate_display_name: estateName.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Successor saved");
    setName(""); setEmail(""); setRelationship(""); setEstateName(""); setNotes("");
    setAdding(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("estate_successors").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((r) => r.filter((x) => x.id !== id));
  };

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="space-y-5">
      {rows.length > 0 && (
        <div className="border border-border rounded-sm divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{r.successor_name}</span>
                  {r.relationship && (
                    <span className="text-sm text-muted-foreground">{r.relationship}</span>
                  )}
                  <Badge variant={r.status === "activated" ? "default" : "outline"} className="text-xs">
                    {r.status === "activated"
                      ? "Active custodian"
                      : r.status === "pending_account"
                        ? "Waiting for account"
                        : r.status === "revoked"
                          ? "Withdrawn"
                          : "Named"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground break-all">{r.successor_email}</p>
                {r.estate_display_name && (
                  <p className="text-sm text-muted-foreground">Estate name: {r.estate_display_name}</p>
                )}
                {r.notes && <p className="text-sm text-muted-foreground mt-1">{r.notes}</p>}
              </div>
              {r.status !== "activated" && (
                <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="border border-border rounded-sm p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="Daughter, spouse, estate lawyer…"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Estate name (optional)</Label>
              <Input
                value={estateName}
                onChange={(e) => setEstateName(e.target.value)}
                placeholder="e.g. Estate of Jane Doe"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Instructions or wishes (optional)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={add} disabled={saving}>
              {saving ? "Saving…" : "Save successor"}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Name a successor
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Nothing changes while you are alive. The foundation only hands the archive over after it has
        seen proof, and it then tells the world the archive is looked after by your estate.
      </p>
    </div>
  );
}
