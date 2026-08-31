import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Mail, Globe, MapPin } from "lucide-react";
import { format } from "date-fns";

type Status = "new" | "reviewing" | "approved" | "declined";

interface RequestRow {
  id: string;
  full_name: string;
  email: string;
  country: string | null;
  city: string | null;
  website: string | null;
  birth_year: number | null;
  practice_summary: string | null;
  cv_url: string | null;
  referred_by: string | null;
  applicant_role: string;
  message: string | null;
  status: string;
  foundation_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUSES: { id: Status; label: string; className: string }[] = [
  { id: "new", label: "New", className: "bg-blue-100 text-blue-800" },
  { id: "reviewing", label: "Reviewing", className: "bg-amber-100 text-amber-800" },
  { id: "approved", label: "Approved", className: "bg-emerald-100 text-emerald-800" },
  { id: "declined", label: "Declined", className: "bg-neutral-200 text-neutral-700" },
];

const TIERS = [
  { id: "internationally_established", label: "Internationally established" },
  { id: "mid_career", label: "Mid career" },
  { id: "emerging", label: "Emerging" },
  { id: "peer", label: "Peer" },
];

export default function InvitationRequests() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [tier, setTier] = useState("emerging");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invitation_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load invitation requests");
    else setRows((data ?? []) as RequestRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.full_name, r.email, r.country, r.city, r.referred_by]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, query, statusFilter]);

  const openRow = (row: RequestRow) => {
    setSelected(row);
    setTier("emerging");
    setNote(row.foundation_notes ?? "");
  };

  const setStatus = async (row: RequestRow, status: Status) => {
    const { error } = await supabase.from("invitation_requests").update({ status }).eq("id", row.id);
    if (error) return toast.error("Could not update status");
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)));
  };

  const decide = async (decision: "approved" | "declined") => {
    if (!selected) return;
    setWorking(true);
    const { data, error } = await supabase.functions.invoke("decide-invitation-request", {
      body: { requestId: selected.id, decision, tier, note },
    });
    setWorking(false);
    const payload = data as { error?: string; code?: string; emailed?: boolean } | null;
    if (error || payload?.error) {
      toast.error(payload?.error || "Could not save the decision");
      return;
    }
    if (decision === "approved") {
      toast.success(
        payload?.emailed
          ? `Invite code ${payload.code} sent to ${selected.email}`
          : `Invite code ${payload?.code} created, but the email could not be delivered`,
      );
    } else {
      toast.success("Application declined");
    }
    setSelected(null);
    load();
  };

  const badge = (status: string) => {
    const meta = STATUSES.find((s) => s.id === status);
    return <Badge className={meta?.className ?? ""}>{meta?.label ?? status}</Badge>;
  };

  return (
    <AppLayout title="Invitation Requests">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicants..." className="pl-8 h-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-secondary animate-pulse rounded-sm" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm py-20 text-center">No invitation requests yet.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => openRow(r)}
                className="w-full text-left p-4 rounded-sm border border-border hover:border-foreground/30 transition-colors bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.full_name} <span className="text-muted-foreground font-normal">· {r.applicant_role}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</span>
                      {(r.city || r.country) && (
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{[r.city, r.country].filter(Boolean).join(", ")}</span>
                      )}
                      {r.website && <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" />{r.website}</span>}
                    </p>
                    {r.practice_summary && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.practice_summary}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {badge(r.status)}
                    <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "d MMM yyyy")}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected?.full_name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="text-muted-foreground space-y-1">
                <p>{selected.email}</p>
                {(selected.city || selected.country) && <p>{[selected.city, selected.country].filter(Boolean).join(", ")}</p>}
                {selected.birth_year && <p>Born {selected.birth_year}</p>}
                {selected.website && <p>{selected.website}</p>}
                {selected.cv_url && <p>CV: {selected.cv_url}</p>}
                {selected.referred_by && <p>Referred by {selected.referred_by}</p>}
              </div>
              {selected.practice_summary && <p className="whitespace-pre-wrap">{selected.practice_summary}</p>}
              {selected.message && <p className="whitespace-pre-wrap text-muted-foreground">{selected.message}</p>}

              <div className="pt-2 border-t border-border space-y-4">
                <div>
                  <Label>Tier for the invite code</Label>
                  <Select value={tier} onValueChange={setTier}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIERS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="note">Personal note in the email (optional)</Label>
                  <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1.5" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => decide("approved")} disabled={working}>
                    {working ? "Working..." : "Approve and send invite code"}
                  </Button>
                  <Button variant="outline" onClick={() => decide("declined")} disabled={working}>Decline</Button>
                  {selected.status === "new" && (
                    <Button variant="ghost" onClick={() => { setStatus(selected, "reviewing"); setSelected(null); }}>
                      Mark as reviewing
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
