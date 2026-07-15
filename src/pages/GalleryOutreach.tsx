import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles, Download, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Gallery {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  established_year: number | null;
  rank: number | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  enrichment_status: string;
  enrichment_attempted_at: string | null;
}

interface Outreach {
  id: string;
  gallery_id: string;
  status: string;
  first_contacted_at: string | null;
  last_contacted_at: string | null;
  replied_at: string | null;
  reply_notes: string | null;
}

const OUTREACH_STATUSES = [
  "not_contacted",
  "queued",
  "sent",
  "opened",
  "replied",
  "interested",
  "signed_up",
  "declined",
  "bounced",
] as const;

const statusColor: Record<string, string> = {
  not_contacted: "bg-muted text-muted-foreground",
  queued: "bg-blue-100 text-blue-800",
  sent: "bg-indigo-100 text-indigo-800",
  opened: "bg-cyan-100 text-cyan-800",
  replied: "bg-yellow-100 text-yellow-800",
  interested: "bg-emerald-100 text-emerald-800",
  signed_up: "bg-green-200 text-green-900",
  declined: "bg-rose-100 text-rose-800",
  bounced: "bg-red-100 text-red-800",
};

const GalleryOutreach = () => {
  const [loading, setLoading] = useState(true);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [outreach, setOutreach] = useState<Record<string, Outreach>>({});
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hasEmailFilter, setHasEmailFilter] = useState<string>("all");
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ processed: number; enriched: number; remaining: number } | null>(null);
  const [selected, setSelected] = useState<Gallery | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingFallbackList, setUsingFallbackList] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    setAccessMessage(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        setGalleries([]);
        setOutreach({});
        setAccessMessage("Sign in with a Foundation account to view the gallery outreach list.");
        return;
      }

      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "foundation")
        .limit(1);

      if (roleError) throw roleError;

      if (!roleRows || roleRows.length === 0) {
        setGalleries([]);
        setOutreach({});
        setAccessMessage("Foundation access is required for gallery outreach.");
        return;
      }

      const columns = "id, name, city, country, established_year, rank, email, phone, website, enrichment_status, enrichment_attempted_at";
      let fallback = false;
      let { data: gs, error: galleriesError } = await (supabase as any)
        .from("galleries")
        .select(columns)
        .lte("rank", 1000)
        .not("rank", "is", null)
        .order("rank", { ascending: true });

      if (galleriesError) throw galleriesError;

      if (!gs || gs.length === 0) {
        fallback = true;
        const fallbackResult = await (supabase as any)
          .from("galleries")
          .select(columns)
          .order("name", { ascending: true })
          .limit(1000);
        if (fallbackResult.error) throw fallbackResult.error;
        gs = fallbackResult.data || [];
      }

      const { data: os, error: outreachError } = await (supabase as any)
        .from("gallery_outreach")
        .select("*");

      if (outreachError) throw outreachError;

      const orMap: Record<string, Outreach> = {};
      (os || []).forEach((o: Outreach) => { orMap[o.gallery_id] = o; });

      setGalleries(gs || []);
      setOutreach(orMap);
      setUsingFallbackList(fallback);
    } catch (e: any) {
      setGalleries([]);
      setOutreach({});
      setUsingFallbackList(false);
      setLoadError(e.message || "Unable to load gallery outreach data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const countries = useMemo(() => {
    const s = new Set<string>();
    galleries.forEach((g) => g.country && s.add(g.country));
    return Array.from(s).sort();
  }, [galleries]);

  const filtered = useMemo(() => {
    return galleries.filter((g) => {
      if (search) {
        const q = search.toLowerCase();
        if (!g.name.toLowerCase().includes(q) &&
            !(g.city || "").toLowerCase().includes(q) &&
            !(g.email || "").toLowerCase().includes(q)) return false;
      }
      if (countryFilter !== "all" && g.country !== countryFilter) return false;
      const status = outreach[g.id]?.status || "not_contacted";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (hasEmailFilter === "yes" && !g.email) return false;
      if (hasEmailFilter === "no" && g.email) return false;
      return true;
    });
  }, [galleries, outreach, search, countryFilter, statusFilter, hasEmailFilter]);

  const stats = useMemo(() => {
    const total = galleries.length;
    const withEmail = galleries.filter((g) => !!g.email).length;
    const contacted = galleries.filter((g) => {
      const s = outreach[g.id]?.status;
      return s && s !== "not_contacted";
    }).length;
    const replied = galleries.filter((g) => ["replied", "interested", "signed_up"].includes(outreach[g.id]?.status || "")).length;
    const signedUp = galleries.filter((g) => outreach[g.id]?.status === "signed_up").length;
    return { total, withEmail, contacted, replied, signedUp };
  }, [galleries, outreach]);

  const runEnrichBatch = async () => {
    setEnriching(true);
    try {
      let keepGoing = true;
      while (keepGoing) {
        const { data, error } = await (supabase.functions.invoke as any)("enrich-galleries", {
          body: { max_rank: 1000, batch_size: 15, concurrency: 5 },
        });
        if (error) throw error;
        setEnrichProgress({ processed: data.processed, enriched: data.enriched, remaining: data.remaining });
        if (data.credits_exhausted) {
          toast.error("AI credits exhausted. Enrichment paused.");
          keepGoing = false;
        } else if (data.done || data.processed === 0) {
          keepGoing = false;
          toast.success("Enrichment complete");
        }
      }
      await load();
    } catch (e: any) {
      toast.error("Enrichment failed: " + (e.message || "unknown"));
    } finally {
      setEnriching(false);
    }
  };

  const runOneBatch = async () => {
    setEnriching(true);
    try {
      const { data, error } = await (supabase.functions.invoke as any)("enrich-galleries", {
        body: { max_rank: 1000, batch_size: 15, concurrency: 5 },
      });
      if (error) throw error;
      setEnrichProgress({ processed: data.processed, enriched: data.enriched, remaining: data.remaining });
      toast.success(`Enriched ${data.enriched} of ${data.processed}. ${data.remaining} left.`);
      await load();
    } catch (e: any) {
      toast.error("Batch failed: " + (e.message || "unknown"));
    } finally {
      setEnriching(false);
    }
  };

  const setStatus = async (galleryId: string, newStatus: string) => {
    const existing = outreach[galleryId];
    const now = new Date().toISOString();
    const patch: any = { status: newStatus };
    if (["sent", "queued"].includes(newStatus) && !existing?.first_contacted_at) patch.first_contacted_at = now;
    if (["sent", "opened", "replied"].includes(newStatus)) patch.last_contacted_at = now;
    if (["replied", "interested", "signed_up"].includes(newStatus)) patch.replied_at = now;

    if (existing) {
      await (supabase as any).from("gallery_outreach").update(patch).eq("id", existing.id);
    } else {
      await (supabase as any).from("gallery_outreach").insert({ gallery_id: galleryId, ...patch });
    }
    load();
  };

  const saveNotes = async () => {
    if (!selected) return;
    const existing = outreach[selected.id];
    if (existing) {
      await (supabase as any).from("gallery_outreach").update({ reply_notes: noteDraft }).eq("id", existing.id);
    } else {
      await (supabase as any).from("gallery_outreach").insert({ gallery_id: selected.id, reply_notes: noteDraft, status: "not_contacted" });
    }
    toast.success("Notes saved");
    setSelected(null);
    load();
  };

  const exportCsv = () => {
    const rows = filtered.map((g) => {
      const o = outreach[g.id];
      return {
        rank: g.rank ?? "",
        name: g.name,
        city: g.city ?? "",
        country: g.country ?? "",
        year: g.established_year ?? "",
        email: g.email ?? "",
        phone: g.phone ?? "",
        website: g.website ?? "",
        status: o?.status ?? "not_contacted",
        last_contacted: o?.last_contacted_at ?? "",
        replied: o?.replied_at ?? "",
        notes: (o?.reply_notes ?? "").replace(/\n/g, " "),
      };
    });
    const headers = Object.keys(rows[0] || { rank: "" });
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => {
        const v = String((r as any)[h] ?? "");
        return `"${v.replace(/"/g, '""')}"`;
      }).join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `garf-supporting-galleries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif">Supporting Galleries Outreach</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {usingFallbackList ? "Imported gallery list. Add ranks to focus the top 1,000." : "Top 1,000 galleries by rank. Enrich contact info, track invitations."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-3.5 h-3.5 mr-1" /> Export CSV</Button>
            <Button size="sm" onClick={runOneBatch} disabled={enriching}>
              {enriching ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
              Enrich 15
            </Button>
            <Button size="sm" variant="default" onClick={runEnrichBatch} disabled={enriching}>
              {enriching ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
              Enrich all missing
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label={usingFallbackList ? "Total shown" : "Total (top 1000)"} value={stats.total} />
          <StatCard label="Has email" value={`${stats.withEmail} / ${stats.total}`} />
          <StatCard label="Contacted" value={stats.contacted} />
          <StatCard label="Replied" value={stats.replied} />
          <StatCard label="Signed up" value={stats.signedUp} />
        </div>

        {enrichProgress && (
          <div className="text-xs text-muted-foreground border border-border rounded-sm px-3 py-2">
            Last batch: processed {enrichProgress.processed}, enriched {enrichProgress.enriched}. Remaining pending: {enrichProgress.remaining}.
          </div>
        )}

        {loadError && (
          <div className="text-sm border border-destructive/40 text-destructive rounded-sm px-3 py-2">
            Could not load outreach data: {loadError}
          </div>
        )}

        {accessMessage && (
          <div className="border border-border rounded-sm px-4 py-12 text-center">
            <div className="font-medium">{accessMessage}</div>
            <Button className="mt-4" variant="outline" onClick={() => { window.location.href = "/login"; }}>
              Sign in
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Search name, city, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {OUTREACH_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={hasEmailFilter} onValueChange={setHasEmailFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Email" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes">Has email</SelectItem>
              <SelectItem value="no">No email</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground ml-auto">{filtered.length} shown</div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : accessMessage ? null : filtered.length === 0 ? (
          <div className="border border-border rounded-sm px-4 py-12 text-center">
            <div className="font-medium">No galleries to show</div>
            <div className="text-sm text-muted-foreground mt-1">Refresh the import or clear filters to view the outreach list.</div>
          </div>
        ) : (
          <div className="border border-border rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Gallery</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((g) => {
                  const o = outreach[g.id];
                  const status = o?.status || "not_contacted";
                  return (
                    <TableRow key={g.id} className="cursor-pointer hover:bg-muted/40" onClick={() => { setSelected(g); setNoteDraft(o?.reply_notes || ""); }}>
                      <TableCell className="text-xs text-muted-foreground">{g.rank}</TableCell>
                      <TableCell>
                        <div className="font-medium">{g.name}</div>
                        {g.enrichment_status !== "not_attempted" && (
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{g.enrichment_status.replace("_", " ")}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{[g.city, g.country].filter(Boolean).join(", ")}</TableCell>
                      <TableCell className="text-sm">
                        {g.email ? <span className="text-foreground">{g.email}</span> : <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {g.phone ? g.phone : <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor[status] || ""} variant="secondary">{status.replace("_", " ")}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length > 500 && (
              <div className="text-xs text-muted-foreground p-3 text-center border-t border-border">Showing first 500 rows. Refine filters or export CSV for the rest.</div>
            )}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Rank</span><div>{selected.rank ?? "—"}</div></div>
                <div><span className="text-muted-foreground">Established</span><div>{selected.established_year ?? "—"}</div></div>
                <div className="col-span-2"><span className="text-muted-foreground">Location</span><div>{[selected.city, selected.country].filter(Boolean).join(", ") || "—"}</div></div>
                <div className="col-span-2"><span className="text-muted-foreground">Email</span><div>{selected.email || "—"}</div></div>
                <div><span className="text-muted-foreground">Phone</span><div>{selected.phone || "—"}</div></div>
                <div><span className="text-muted-foreground">Website</span><div className="truncate">{selected.website || "—"}</div></div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Outreach status</label>
                <Select value={outreach[selected.id]?.status || "not_contacted"} onValueChange={(v) => setStatus(selected.id, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OUTREACH_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Notes / reply summary</label>
                <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={4} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                <Button onClick={saveNotes}>Save notes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="border border-border rounded-sm p-3">
    <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className="text-2xl font-serif mt-1">{value}</div>
  </div>
);

export default GalleryOutreach;
