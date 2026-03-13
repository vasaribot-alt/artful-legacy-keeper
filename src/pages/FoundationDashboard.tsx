import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Award } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

type Tier = "internationally_established" | "mid_career" | "emerging";

interface InviteCode {
  id: string;
  code: string;
  tier: Tier;
  is_active: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

interface FoundingArtistRow {
  user_id: string;
  tier: string;
  joined_at: string;
}

const tierLabels: Record<Tier, string> = {
  internationally_established: "Internationally Established",
  mid_career: "Mid-Career",
  emerging: "Emerging & Global Voices",
};

const generateCode = (tier: Tier): string => {
  const prefixes: Record<Tier, string> = {
    internationally_established: "EST",
    mid_career: "MID",
    emerging: "EMG",
  };
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FOUNDING-${prefixes[tier]}-${random}`;
};

const FoundationDashboard = () => {
  const navigate = useNavigate();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [artists, setArtists] = useState<FoundingArtistRow[]>([]);
  const [newTier, setNewTier] = useState<Tier>("internationally_established");
  const [batchCount, setBatchCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isFoundation, setIsFoundation] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasFoundation = roles?.some((r) => r.role === "foundation");
      if (!hasFoundation) { navigate("/dashboard"); return; }
      setIsFoundation(true);

      await fetchData();
    };
    init();
  }, [navigate]);

  const fetchData = async () => {
    const [codesRes, artistsRes] = await Promise.all([
      supabase.from("invite_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("founding_artists").select("user_id, tier, joined_at"),
    ]);
    if (codesRes.data) setCodes(codesRes.data as InviteCode[]);
    if (artistsRes.data) setArtists(artistsRes.data);
    setLoading(false);
  };

  const handleGenerateCodes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newCodes = Array.from({ length: batchCount }, () => ({
      code: generateCode(newTier),
      tier: newTier,
      created_by: user.id,
    }));

    const { error } = await supabase.from("invite_codes").insert(newCodes);
    if (error) {
      toast.error("Failed to generate codes");
    } else {
      toast.success(`Generated ${batchCount} invite code(s)`);
      fetchData();
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const handleDeleteCode = async (id: string) => {
    const { error } = await supabase.from("invite_codes").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete code");
    } else {
      toast.success("Code deleted");
      setCodes((prev) => prev.filter((c) => c.id !== id));
    }
  };

  if (!isFoundation || loading) return null;

  const unused = codes.filter((c) => !c.used_by && c.is_active);
  const used = codes.filter((c) => c.used_by);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Award className="h-6 w-6" />
            <h1 className="text-2xl font-semibold">Founding Artist Program</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate and manage invite codes for founding artists. {artists.length} artist(s) enrolled.
          </p>
        </div>

        {/* Generate codes */}
        <section className="border border-border rounded-sm p-6 space-y-4">
          <h2 className="text-lg font-medium">Generate Invite Codes</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Tier</Label>
              <Select value={newTier} onValueChange={(v) => setNewTier(v as Tier)}>
                <SelectTrigger className="w-64 mt-1.5">
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
              <Label>Count</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="w-20 mt-1.5"
              />
            </div>
            <Button onClick={handleGenerateCodes}>
              <Plus className="h-4 w-4 mr-1" /> Generate
            </Button>
          </div>
        </section>

        {/* Unused codes */}
        <section>
          <h2 className="text-lg font-medium mb-4">Available Codes ({unused.length})</h2>
          {unused.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unused codes. Generate some above.</p>
          ) : (
            <div className="border border-border rounded-sm divide-y divide-border">
              {unused.map((code) => (
                <div key={code.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono tracking-wider">{code.code}</code>
                    <Badge variant="outline" className="text-xs">{tierLabels[code.tier]}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleCopyCode(code.code)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCode(code.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Used codes / enrolled artists */}
        <section>
          <h2 className="text-lg font-medium mb-4">Enrolled Founding Artists ({used.length})</h2>
          {used.length === 0 ? (
            <p className="text-sm text-muted-foreground">No artists have used an invite code yet.</p>
          ) : (
            <div className="border border-border rounded-sm divide-y divide-border">
              {used.map((code) => (
                <div key={code.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono tracking-wider text-muted-foreground">{code.code}</code>
                    <Badge variant="secondary" className="text-xs">{tierLabels[code.tier]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Used {code.used_at ? new Date(code.used_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

export default FoundationDashboard;
