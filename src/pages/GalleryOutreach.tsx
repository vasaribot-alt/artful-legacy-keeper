import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles, Download, Play, RefreshCw, Copy, Mail } from "lucide-react";
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
  contact_name: string | null;
  contact_title: string | null;
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
  email_subject: string | null;
  email_body: string | null;
  email_generated_at: string | null;
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

const DEFAULT_SIGNATURE = `Jan S Kindem
Email: jan@globalartistregistry.org
Direct phone: +47 94235177

Global Artist Registry Foundation
Jan Pieterszoon Coenstraat 7, The Hague, 2595 WP, The Netherlands
Web: https://globalartistregistry.org/
Phone: +31-850 600 529`;

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
  const [contactNameDraft, setContactNameDraft] = useState("");
  const [contactTitleDraft, setContactTitleDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [cityDraft, setCityDraft] = useState("");
  const [countryDraft, setCountryDraft] = useState("");
  const [establishedYearDraft, setEstablishedYearDraft] = useState("");
  const [rankDraft, setRankDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [websiteDraft, setWebsiteDraft] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingFallbackList, setUsingFallbackList] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  // Drafting
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftLanguage, setDraftLanguage] = useState<string>("English");
  const [draftSenderName, setDraftSenderName] = useState<string>(
    () => localStorage.getItem("garf.outreach.senderName") || ""
  );
  const [draftRecipientCapacity, setDraftRecipientCapacity] = useState<string>("");
  const [draftSignature, setDraftSignature] = useState<string>(
    () => localStorage.getItem("garf.outreach.signature") || DEFAULT_SIGNATURE
  );
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

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

      const columns = "id, name, city, country, established_year, rank, email, phone, website, contact_name, contact_title, enrichment_status, enrichment_attempted_at";
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
            !(g.email || "").toLowerCase().includes(q) &&
            !(g.contact_name || "").toLowerCase().includes(q)) return false;
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

  const saveDetails = async () => {
    if (!selected) return;

    const galleryUpdate: any = {
      name: nameDraft.trim() || selected.name,
      city: cityDraft.trim() || null,
      country: countryDraft.trim() || null,
      established_year: establishedYearDraft.trim() ? parseInt(establishedYearDraft.trim(), 10) : null,
      rank: rankDraft.trim() ? parseInt(rankDraft.trim(), 10) : null,
      email: emailDraft.trim() || null,
      phone: phoneDraft.trim() || null,
      website: websiteDraft.trim() || null,
      contact_name: contactNameDraft.trim() || null,
      contact_title: contactTitleDraft.trim() || null,
    };

    const { error: gErr } = await (supabase as any)
      .from("galleries")
      .update(galleryUpdate)
      .eq("id", selected.id);
    if (gErr) {
      toast.error("Could not save gallery details: " + gErr.message);
      return;
    }

    const existing = outreach[selected.id];
    if (existing) {
      await (supabase as any).from("gallery_outreach").update({ reply_notes: noteDraft }).eq("id", existing.id);
    } else {
      await (supabase as any).from("gallery_outreach").insert({ gallery_id: selected.id, reply_notes: noteDraft, status: "not_contacted" });
    }
    toast.success("Saved");
    setSelected(null);
    load();
  };

  const openDraft = () => {
    if (!selected) return;
    const o = outreach[selected.id];
    setDraftSubject(o?.email_subject || "");
    setDraftBody(o?.email_body || "");
    setDraftLanguage("English");
    const title = contactTitleDraft.trim() || selected.contact_title || "";
    const person = contactNameDraft.trim() || selected.contact_name || "";
    setDraftRecipientCapacity(
      title
        ? (person ? `${title}, ${person} of ${selected.name}` : `${title} of ${selected.name}`)
        : ""
    );
    setDraftOpen(true);
  };

  const generateDraft = async () => {
    if (!selected) return;
    localStorage.setItem("garf.outreach.senderName", draftSenderName.trim());
    localStorage.setItem("garf.outreach.signature", draftSignature);
    setDraftGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-outreach-email", {
      body: {
        gallery_id: selected.id,
        language: draftLanguage,
        sender_name: draftSenderName.trim() || undefined,
        recipient_capacity: draftRecipientCapacity.trim() || undefined,
        contact_person: (contactNameDraft.trim() || selected.contact_name) || undefined,
        signature: draftSignature.trim() || undefined,
      },
    });
    setDraftGenerating(false);
    if (error || !(data as any)?.success) {
      toast.error((data as any)?.error || error?.message || "Could not generate draft");
      return;
    }
    setDraftSubject((data as any).subject || "");
    setDraftBody((data as any).body || "");
    toast.success("Draft generated");
    load();
  };

  const saveDraft = async () => {
    if (!selected) return;
    const existing = outreach[selected.id];
    const payload = {
      email_subject: draftSubject || null,
      email_body: draftBody || null,
    };
    if (existing) {
      await (supabase as any).from("gallery_outreach").update(payload).eq("id", existing.id);
    } else {
      await (supabase as any).from("gallery_outreach").insert({
        gallery_id: selected.id, status: "not_contacted", ...payload,
      });
    }
    toast.success("Draft saved");
    load();
  };

  const copyDraft = async () => {
    const text = draftSubject ? `Subject: ${draftSubject}\n\n${draftBody}` : draftBody;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
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
        contact_name: g.contact_name ?? "",
        contact_title: g.contact_title ?? "",
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

        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Search name, city, email, contact…"
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
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((g) => {
                  const o = outreach[g.id];
                  const status = o?.status || "not_contacted";
                  return (
                    <TableRow
                      key={g.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => {
                        setSelected(g);
                        setNoteDraft(o?.reply_notes || "");
                        setContactNameDraft(g.contact_name || "");
                        setContactTitleDraft(g.contact_title || "");
                        setNameDraft(g.name || "");
                        setCityDraft(g.city || "");
                        setCountryDraft(g.country || "");
                        setEstablishedYearDraft(g.established_year?.toString() || "");
                        setRankDraft(g.rank?.toString() || "");
                        setEmailDraft(g.email || "");
                        setPhoneDraft(g.phone || "");
                        setWebsiteDraft(g.website || "");
                      }}
                    >
                      <TableCell className="text-xs text-muted-foreground">{g.rank}</TableCell>
                      <TableCell>
                        <div className="font-medium">{g.name}</div>
                        {g.enrichment_status !== "not_attempted" && (
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{g.enrichment_status.replace("_", " ")}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{[g.city, g.country].filter(Boolean).join(", ")}</TableCell>
                      <TableCell className="text-sm">
                        {g.contact_name ? (
                          <div>
                            <div>{g.contact_name}</div>
                            {g.contact_title && <div className="text-xs text-muted-foreground">{g.contact_title}</div>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {g.email ? <span className="text-foreground">{g.email}</span> : <span className="text-muted-foreground italic">—</span>}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{nameDraft || selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Gallery name</Label>
                  <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Gallery name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Rank</Label>
                    <Input type="number" value={rankDraft} onChange={(e) => setRankDraft(e.target.value)} placeholder="e.g. 12" />
                  </div>
                  <div>
                    <Label className="text-xs">Established</Label>
                    <Input type="number" value={establishedYearDraft} onChange={(e) => setEstablishedYearDraft(e.target.value)} placeholder="e.g. 1995" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">City</Label>
                    <Input value={cityDraft} onChange={(e) => setCityDraft(e.target.value)} placeholder="City" />
                  </div>
                  <div>
                    <Label className="text-xs">Country</Label>
                    <Input value={countryDraft} onChange={(e) => setCountryDraft(e.target.value)} placeholder="Country" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="contact@gallery.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} placeholder="Phone number" />
                  </div>
                  <div>
                    <Label className="text-xs">Website</Label>
                    <Input value={websiteDraft} onChange={(e) => setWebsiteDraft(e.target.value)} placeholder="https://…" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Contact name</Label>
                  <Input
                    value={contactNameDraft}
                    onChange={(e) => setContactNameDraft(e.target.value)}
                    placeholder="e.g. Larry Gagosian"
                  />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={contactTitleDraft}
                    onChange={(e) => setContactTitleDraft(e.target.value)}
                    placeholder="e.g. Director"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Outreach status</Label>
                <Select value={outreach[selected.id]?.status || "not_contacted"} onValueChange={(v) => setStatus(selected.id, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OUTREACH_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Notes / reply summary</Label>
                <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={4} />
              </div>

              <div className="flex flex-wrap justify-between gap-2 pt-1">
                <Button variant="outline" onClick={openDraft}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  {outreach[selected.id]?.email_body ? "Email draft" : "Generate email"}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                  <Button onClick={saveDetails}>Save</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Draft dialog */}
      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email draft — {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Your name (as sender)</Label>
                <Input
                  value={draftSenderName}
                  onChange={(e) => setDraftSenderName(e.target.value)}
                  placeholder="e.g. Jan S. Kindem"
                />
              </div>
              <div>
                <Label>Recipient's capacity / title</Label>
                <Input
                  value={draftRecipientCapacity}
                  onChange={(e) => setDraftRecipientCapacity(e.target.value)}
                  placeholder={`e.g. Director of ${selected?.name || "the gallery"}`}
                />
              </div>
            </div>
            <div>
              <Label>Signature (appended verbatim)</Label>
              <Textarea
                rows={8}
                value={draftSignature}
                onChange={(e) => setDraftSignature(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <Label>Language</Label>
                <Select value={draftLanguage} onValueChange={setDraftLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["English", "French", "German", "Spanish", "Italian", "Dutch", "Portuguese"].map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generateDraft} disabled={draftGenerating}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                {draftGenerating ? "Generating…" : draftBody ? "Regenerate" : "Generate"}
              </Button>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} placeholder="Subject line" />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea rows={14} value={draftBody} onChange={(e) => setDraftBody(e.target.value)} placeholder="Email body — click Generate to draft with AI." />
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={copyDraft} disabled={!draftBody}>
              <Copy className="w-4 h-4 mr-1.5" />Copy
            </Button>
            {selected?.email && (
              <Button asChild variant="outline" disabled={!draftBody}>
                <a href={`mailto:${selected.email}?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`}>
                  <Mail className="w-4 h-4 mr-1.5" />Open in mail app
                </a>
              </Button>
            )}
            <Button onClick={saveDraft} disabled={!draftBody && !draftSubject}>Save draft</Button>
          </DialogFooter>
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
