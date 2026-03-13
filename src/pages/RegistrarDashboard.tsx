import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Search, Send, Clock, CheckCircle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ClientAccess {
  id: string;
  owner_id: string;
  status: string;
  requested_by: string;
  granted_at: string;
  message: string | null;
  owner_name: string | null;
  owner_email: string | null;
  artwork_count: number;
}

const RegistrarDashboard = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientAccess[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ClientAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyEmail, setApplyEmail] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    // Fetch all registrar_access records for this registrar
    const { data: accessData, error } = await supabase
      .from("registrar_access")
      .select("*")
      .eq("registrar_id", user.id);

    if (error) {
      toast.error("Failed to load clients");
      setLoading(false);
      return;
    }

    if (!accessData || accessData.length === 0) {
      setClients([]);
      setPendingRequests([]);
      setLoading(false);
      return;
    }

    // Fetch profiles for each owner
    const ownerIds = [...new Set(accessData.map(a => a.owner_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", ownerIds);

    // Fetch artwork counts per owner
    const enriched: ClientAccess[] = await Promise.all(
      accessData.map(async (access) => {
        const profile = profiles?.find(p => p.user_id === access.owner_id);
        const { count } = await supabase
          .from("artworks")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", access.owner_id);

        return {
          ...access,
          owner_name: profile?.full_name || null,
          owner_email: profile?.email || null,
          artwork_count: count || 0,
        };
      })
    );

    setClients(enriched.filter(c => c.status === "approved"));
    setPendingRequests(enriched.filter(c => c.status === "pending"));
    setLoading(false);
  };

  const handleApplyForAccess = async () => {
    if (!applyEmail.trim()) {
      toast.error("Please enter the owner's email");
      return;
    }
    setApplying(true);

    // Look up user by email in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", applyEmail.trim().toLowerCase())
      .single();

    if (!profile) {
      toast.error("No user found with that email address");
      setApplying(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setApplying(false); return; }

    // Check if access already exists
    const { data: existing } = await supabase
      .from("registrar_access")
      .select("id")
      .eq("registrar_id", user.id)
      .eq("owner_id", profile.user_id)
      .single();

    if (existing) {
      toast.info("You already have a pending or active access request for this user");
      setApplying(false);
      return;
    }

    const { error } = await supabase
      .from("registrar_access")
      .insert({
        registrar_id: user.id,
        owner_id: profile.user_id,
        requested_by: "registrar",
        message: applyMessage.trim() || null,
      });

    if (error) {
      toast.error("Failed to send access request");
    } else {
      toast.success("Access request sent!");
      setApplyDialogOpen(false);
      setApplyEmail("");
      setApplyMessage("");
      fetchClients();
    }
    setApplying(false);
  };

  const filteredClients = clients.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (c.owner_name?.toLowerCase().includes(q) || c.owner_email?.toLowerCase().includes(q));
  });

  return (
    <AppLayout
      title="Registrar Dashboard"
      headerActions={
        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Apply for Access
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Client Access</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label htmlFor="ownerEmail">Owner's email address</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={applyEmail}
                  onChange={(e) => setApplyEmail(e.target.value)}
                  placeholder="artist@example.com"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea
                  id="message"
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="Introduce yourself and explain why you'd like access..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>
              <Button onClick={handleApplyForAccess} disabled={applying} className="w-full">
                {applying ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Pending Requests
            </h2>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-4 rounded-sm border border-border bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium">{req.owner_name || req.owner_email || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.requested_by === "registrar" ? "You applied" : "Invited by owner"} · Awaiting approval
                    </p>
                  </div>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active clients */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="pl-8 h-9"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-secondary animate-pulse rounded-sm" />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">
              {clients.length === 0 ? "No clients yet" : "No matching clients"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Apply for access to an artist or collector's catalogue raisonné.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => navigate(`/registrar/client/${client.owner_id}`)}
                className="text-left p-5 rounded-sm border border-border hover:border-foreground/30 transition-colors bg-card"
              >
                <p className="font-medium text-sm">{client.owner_name || "Unnamed"}</p>
                {client.owner_email && (
                  <p className="text-xs text-muted-foreground mt-0.5">{client.owner_email}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">
                    {client.artwork_count} artwork{client.artwork_count !== 1 ? "s" : ""}
                  </span>
                  <CheckCircle className="w-3 h-3 text-primary" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default RegistrarDashboard;
