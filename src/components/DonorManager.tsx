import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Heart, Download } from "lucide-react";

type DonorTier = "platinum" | "gold" | "silver" | "bronze";

interface Donor {
  id: string;
  full_name: string;
  email: string | null;
  tier: DonorTier;
  message: string | null;
  is_public: boolean;
  created_at: string;
}

const tierLabels: Record<DonorTier, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

const DonorManager = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTier, setNewTier] = useState<DonorTier>("bronze");
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    const { data } = await supabase
      .from("donors")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDonors(data as Donor[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("donors").insert({
      full_name: newName.trim(),
      email: newEmail.trim() || null,
      tier: newTier,
      message: newMessage.trim() || null,
      added_by: user.id,
    });

    if (error) {
      toast.error("Failed to add donor");
    } else {
      toast.success("Donor added");
      setNewName("");
      setNewEmail("");
      setNewMessage("");
      fetchDonors();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("donors").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete donor");
    } else {
      toast.success("Donor removed");
      setDonors((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleTogglePublic = async (id: string, isPublic: boolean) => {
    const { error } = await supabase.from("donors").update({ is_public: isPublic }).eq("id", id);
    if (error) {
      toast.error("Failed to update visibility");
    } else {
      setDonors((prev) => prev.map((d) => d.id === id ? { ...d, is_public: isPublic } : d));
    }
  };

  const handleExportCsv = () => {
    const rows = donors.map((d) =>
      [d.full_name, d.email || "", tierLabels[d.tier], d.is_public ? "Public" : "Private", d.message || "", new Date(d.created_at).toLocaleDateString()]
        .map((v) => `"${v}"`)
        .join(",")
    );
    const csv = ["Name,Email,Tier,Visibility,Message,Added Date", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `donors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  if (loading) return null;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Heart className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Donor Management</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {donors.length} donor(s) registered. Public donors appear on the{" "}
          <a href="/donors" className="underline">Supporters page</a>.
        </p>
        {donors.length > 0 && (
          <Button variant="outline" size="sm" className="mt-3" onClick={handleExportCsv}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        )}
      </div>

      {/* Add donor form */}
      <section className="border border-border rounded-sm p-6 space-y-4">
        <h3 className="text-base font-medium">Add Donor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Full Name *</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Jane Doe"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="jane@example.com"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
          <div>
            <Label>Tier</Label>
            <Select value={newTier} onValueChange={(v) => setNewTier(v as DonorTier)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tierLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Public Message (optional)</Label>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="A short note shown publicly"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Donor
        </Button>
      </section>

      {/* Donor list */}
      {donors.length > 0 && (
        <section>
          <h3 className="text-base font-medium mb-4">All Donors ({donors.length})</h3>
          <div className="border border-border rounded-sm divide-y divide-border">
            {donors.map((donor) => (
              <div key={donor.id} className="flex items-center justify-between p-3 gap-4">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <span className="text-sm font-medium">{donor.full_name}</span>
                  <Badge variant="outline" className="text-xs">{tierLabels[donor.tier]}</Badge>
                  {donor.email && (
                    <span className="text-xs text-muted-foreground">{donor.email}</span>
                  )}
                  {donor.message && (
                    <span className="text-xs text-muted-foreground italic truncate max-w-48">"{donor.message}"</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Public</span>
                    <Switch
                      checked={donor.is_public}
                      onCheckedChange={(checked) => handleTogglePublic(donor.id, checked)}
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(donor.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default DonorManager;
