import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, ExternalLink, Search } from "lucide-react";

type Category = "curator" | "gallery" | "museum" | "university" | "foundation" | "corporate_collection" | "artist_association" | "other";
type Status = "new" | "contacted" | "accepted" | "declined" | "archived";

interface AllianceMember {
  id: string;
  category: Category;
  full_name: string;
  email: string;
  institution: string | null;
  role_title: string | null;
  country: string | null;
  website: string | null;
  linkedin: string | null;
  message: string | null;
  referral_source: string | null;
  status: Status;
  internal_notes: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  curator: "Curator",
  gallery: "Gallery",
  museum: "Museum",
  university: "University",
  foundation: "Foundation",
  corporate_collection: "Corporate Collection",
  artist_association: "Artist Association",
  other: "Other",
};

const STATUSES: Status[] = ["new", "contacted", "accepted", "declined", "archived"];

export default function AllianceAdmin() {
  const [members, setMembers] = useState<AllianceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("global_alliance_members")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Could not load applications.");
    } else {
      setMembers((data as AllianceMember[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateMember = async (id: string, patch: Partial<AllianceMember>) => {
    const { error } = await supabase
      .from("global_alliance_members")
      .update({ ...patch, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Could not update."); return; }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
    toast.success("Updated");
  };

  const filtered = members.filter(m => {
    if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      if (![m.full_name, m.email, m.institution, m.country].some(f => f?.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const stats = members.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout title="Global Alliance">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-serif">Global Alliance applications</h1>
          <p className="text-muted-foreground text-sm">
            Applications from curators, galleries, museums, universities, foundations, and corporate collections.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => (
            <div key={c} className="border border-border rounded-md p-3">
              <div className="text-xs text-muted-foreground">{CATEGORY_LABELS[c]}</div>
              <div className="text-2xl font-serif">{stats[c] || 0}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, institution…" className="pl-9" />
            </div>
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as Category | "all")}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">No applications yet.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map(m => (
              <div key={m.id} className="border border-border rounded-lg p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{m.full_name}</h3>
                      <Badge variant="outline">{CATEGORY_LABELS[m.category]}</Badge>
                      <Badge variant={m.status === "new" ? "default" : "secondary"}>{m.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {m.role_title && <>{m.role_title} · </>}
                      {m.institution || "Independent"}
                      {m.country && <> · {m.country}</>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(m.created_at).toLocaleDateString()}
                      {m.referral_source && <> · via {m.referral_source}</>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button asChild size="sm" variant="outline">
                      <a href={`mailto:${m.email}`}><Mail className="w-3.5 h-3.5 mr-1.5" />Email</a>
                    </Button>
                    {m.website && (
                      <Button asChild size="sm" variant="outline">
                        <a href={m.website} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Website</a>
                      </Button>
                    )}
                    {m.linkedin && (
                      <Button asChild size="sm" variant="outline">
                        <a href={m.linkedin} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />LinkedIn</a>
                      </Button>
                    )}
                  </div>
                </div>

                {m.message && (
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-secondary/40 rounded-md p-3">{m.message}</p>
                )}

                <div className="grid md:grid-cols-[200px_1fr] gap-3 items-start pt-2 border-t border-border">
                  <Select value={m.status} onValueChange={(v) => updateMember(m.id, { status: v as Status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Internal notes…"
                    rows={2}
                    defaultValue={m.internal_notes || ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== (m.internal_notes || "")) updateMember(m.id, { internal_notes: v || null });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
