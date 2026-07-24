import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Mail, Phone, Building2, User, Calendar } from "lucide-react";
import { format } from "date-fns";

type Tier = "bronze" | "silver" | "gold" | "platinum";
type Status = "new" | "contacted" | "pledged" | "gifted" | "declined";
type ApplicantType = "individual" | "foundation" | "corporation";

interface Application {
  id: string;
  applicant_type: ApplicantType;
  contact_name: string;
  organization_name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  tier: Tier;
  pledge_amount_eur: number | null;
  anonymous_public: boolean;
  message: string | null;
  source: string | null;
  status: Status;
  foundation_notes: string | null;
  followup_at: string | null;
  created_at: string;
  updated_at: string;
}

const TIER_META: Record<Tier, { name: string; range: string }> = {
  bronze:   { name: "Bronze",   range: "€10K – €25K" },
  silver:   { name: "Silver",   range: "€25K – €50K" },
  gold:     { name: "Gold",     range: "€50K – €100K" },
  platinum: { name: "Platinum", range: "€100K+" },
};

const STATUSES: { id: Status; label: string; className: string }[] = [
  { id: "new",       label: "New",       className: "bg-blue-100 text-blue-800" },
  { id: "contacted", label: "Contacted", className: "bg-amber-100 text-amber-800" },
  { id: "pledged",   label: "Pledged",   className: "bg-purple-100 text-purple-800" },
  { id: "gifted",    label: "Gifted",    className: "bg-emerald-100 text-emerald-800" },
  { id: "declined",  label: "Declined",  className: "bg-neutral-200 text-neutral-700" },
];

export default function FoundingSupporterAdmin() {
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");
  const [selected, setSelected] = useState<Application | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("founding_supporter_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Could not load applications");
    } else {
      setRows((data ?? []) as Application[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (tierFilter !== "all" && r.tier !== tierFilter) return false;
      if (!q) return true;
      return [r.contact_name, r.organization_name, r.email, r.country]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [rows, query, statusFilter, tierFilter]);

  const totals = useMemo(() => {
    const pledged = rows.filter((r) => r.status === "pledged" || r.status === "gifted");
    const sum = pledged.reduce((acc, r) => acc + (r.pledge_amount_eur ?? 0), 0);
    return {
      total: rows.length,
      new: rows.filter((r) => r.status === "new").length,
      pledged: pledged.length,
      pledgedAmount: sum,
    };
  }, [rows]);

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase
      .from("founding_supporter_applications")
      .update({ status })
      .eq("id", id);
    if (error) return toast.error("Could not update");
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (selected?.id === id) setSelected({ ...selected, status });
    toast.success("Status updated");
  };

  const saveDetail = async (patch: Partial<Application>) => {
    if (!selected) return;
    const { error } = await supabase
      .from("founding_supporter_applications")
      .update(patch)
      .eq("id", selected.id);
    if (error) return toast.error("Could not save");
    const next = { ...selected, ...patch } as Application;
    setSelected(next);
    setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)));
    toast.success("Saved");
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-serif">Founding Supporter Applications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Prospective major donors — track outreach from first inquiry through gift.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={String(totals.total)} />
          <StatCard label="New leads" value={String(totals.new)} />
          <StatCard label="Pledged / gifted" value={String(totals.pledged)} />
          <StatCard label="Pledged amount" value={`€${totals.pledgedAmount.toLocaleString("en-US")}`} />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, organisation, email, country…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as Tier | "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {(Object.keys(TIER_META) as Tier[]).map((t) => (
                <SelectItem key={t} value={t}>{TIER_META[t].name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No applications match your filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Applicant</th>
                  <th className="text-left px-4 py-3">Tier</th>
                  <th className="text-left px-4 py-3">Pledge</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Received</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => setSelected(r)} className="border-t border-border hover:bg-secondary/40 cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="font-medium flex items-center gap-2">
                        {r.applicant_type === "individual" ? <User className="w-3.5 h-3.5 text-muted-foreground" /> : <Building2 className="w-3.5 h-3.5 text-muted-foreground" />}
                        {r.contact_name}
                        {r.anonymous_public && <Badge variant="outline" className="text-[10px]">anon</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.organization_name ? `${r.organization_name} · ` : ""}{r.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{TIER_META[r.tier].name}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {r.pledge_amount_eur ? `€${r.pledge_amount_eur.toLocaleString("en-US")}` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-1 rounded ${STATUSES.find(s => s.id === r.status)?.className}`}>
                        {STATUSES.find(s => s.id === r.status)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(r.created_at), "d MMM yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">{selected.contact_name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoLine icon={Mail} label="Email" value={selected.email} />
                    <InfoLine icon={Phone} label="Phone" value={selected.phone || "—"} />
                    <InfoLine icon={Building2} label="Organisation" value={selected.organization_name || "—"} />
                    <InfoLine icon={User} label="Applicant type" value={selected.applicant_type} />
                    <InfoLine icon={Calendar} label="Received" value={format(new Date(selected.created_at), "d MMM yyyy, HH:mm")} />
                    <InfoLine icon={User} label="Country" value={selected.country || "—"} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tier</Label>
                      <Select value={selected.tier} onValueChange={(v) => saveDetail({ tier: v as Tier })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(TIER_META) as Tier[]).map((t) => (
                            <SelectItem key={t} value={t}>{TIER_META[t].name} — {TIER_META[t].range}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v as Status)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Indicative pledge (EUR)</Label>
                      <Input
                        type="number"
                        defaultValue={selected.pledge_amount_eur ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value ? Math.round(parseFloat(e.target.value)) : null;
                          if (v !== selected.pledge_amount_eur) saveDetail({ pledge_amount_eur: v });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Follow-up date</Label>
                      <Input
                        type="date"
                        defaultValue={selected.followup_at ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value || null;
                          if (v !== selected.followup_at) saveDetail({ followup_at: v });
                        }}
                      />
                    </div>
                  </div>

                  {selected.message && (
                    <div>
                      <Label className="mb-1 block">Applicant's message</Label>
                      <div className="border border-border rounded p-3 whitespace-pre-wrap text-muted-foreground">{selected.message}</div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="fnotes">Internal notes</Label>
                    <Textarea
                      id="fnotes"
                      rows={5}
                      defaultValue={selected.foundation_notes ?? ""}
                      placeholder="Calls, meetings, next steps, board decisions…"
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== selected.foundation_notes) saveDetail({ foundation_notes: v });
                      }}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Public recognition:</span>
                    {selected.anonymous_public
                      ? <Badge variant="outline">Anonymous requested</Badge>
                      : <Badge variant="outline">May be recognised publicly</Badge>}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-serif mt-1">{value}</div>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="mt-0.5 break-words">{value}</div>
    </div>
  );
}
