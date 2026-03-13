import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Plus, Check, X, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AccessRecord {
  id: string;
  registrar_id: string;
  status: string;
  requested_by: string;
  message: string | null;
  granted_at: string;
  registrar_name: string | null;
  registrar_email: string | null;
}

export function ManageRegistrarAccess() {
  const [records, setRecords] = useState<AccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchAccess();
  }, []);

  const fetchAccess = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("registrar_access")
      .select("*")
      .eq("owner_id", user.id);

    if (!data) { setLoading(false); return; }

    // Enrich with registrar profile info
    const registrarIds = [...new Set(data.map(d => d.registrar_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", registrarIds);

    const enriched: AccessRecord[] = data.map(d => {
      const profile = profiles?.find(p => p.user_id === d.registrar_id);
      return {
        ...d,
        registrar_name: profile?.full_name || null,
        registrar_email: profile?.email || null,
      };
    });

    setRecords(enriched);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);

    // Find registrar by email through secure backend lookup (bypasses profile RLS safely)
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const { data: registrarUserId, error: lookupError } = await (supabase as any).rpc(
      "find_registrar_by_email",
      { _email: normalizedEmail }
    );

    if (lookupError) {
      toast.error("Could not validate registrar email");
      setInviting(false);
      return;
    }

    if (!registrarUserId) {
      toast.error("No registrar found with that email");
      setInviting(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInviting(false); return; }

    const { error } = await supabase
      .from("registrar_access")
      .insert({
        owner_id: user.id,
        registrar_id: registrarUserId,
        requested_by: "owner",
        status: "approved",
      });

    if (error) {
      if (error.code === "23505") {
        toast.info("This registrar already has access");
      } else {
        toast.error("Failed to grant access");
      }
    } else {
      toast.success("Access granted!");
      setDialogOpen(false);
      setInviteEmail("");
      fetchAccess();
    }
    setInviting(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from("registrar_access")
      .update({ status: "approved" })
      .eq("id", id);
    if (error) toast.error("Failed to approve");
    else { toast.success("Access approved"); fetchAccess(); }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from("registrar_access")
      .delete()
      .eq("id", id);
    if (error) toast.error("Failed to reject");
    else { toast.success("Request rejected"); fetchAccess(); }
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase
      .from("registrar_access")
      .delete()
      .eq("id", id);
    if (error) toast.error("Failed to revoke access");
    else { toast.success("Access revoked"); fetchAccess(); }
  };

  const pending = records.filter(r => r.status === "pending");
  const approved = records.filter(r => r.status === "approved");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Registrar Access</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Invite Registrar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Registrar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label htmlFor="regEmail">Registrar's email</Label>
                <Input
                  id="regEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="registrar@example.com"
                  className="mt-1.5"
                />
              </div>
              <Button onClick={handleInvite} disabled={inviting} className="w-full">
                {inviting ? "Inviting..." : "Grant Access"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending requests from registrars */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Pending Requests</p>
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-sm border border-border bg-secondary/50">
                <div>
                  <p className="text-sm font-medium">{r.registrar_name || r.registrar_email || "Unknown"}</p>
                  {r.message && <p className="text-xs text-muted-foreground mt-0.5 italic">"{r.message}"</p>}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => handleApprove(r.id)} className="gap-1 h-7 text-xs">
                    <Check className="w-3 h-3" /> Approve
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleReject(r.id)} className="h-7 text-xs text-destructive">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active registrars */}
      {approved.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Active Registrars</p>
          <div className="space-y-2">
            {approved.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-sm border border-border">
                <div>
                  <p className="text-sm font-medium">{r.registrar_name || r.registrar_email || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">Full catalogue raisonné access</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleRevoke(r.id)} className="h-7 text-xs text-destructive gap-1">
                  <Trash2 className="w-3 h-3" /> Revoke
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : !loading && pending.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No registrars have access. Invite one to help manage your catalogue.
        </p>
      )}
    </div>
  );
}
