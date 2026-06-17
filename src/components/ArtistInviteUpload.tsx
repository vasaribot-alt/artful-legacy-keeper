import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Plus, Trash2, Copy, Download, Search, Sparkles, Mail, Loader2, ExternalLink } from "lucide-react";
import * as XLSX from "xlsx";

type Tier = "internationally_established" | "mid_career" | "emerging";

const tierLabels: Record<Tier, string> = {
  internationally_established: "Internationally Established",
  mid_career: "Mid-Career",
  emerging: "Emerging & Global Voices",
};

const tierPrefixes: Record<Tier, string> = {
  internationally_established: "EST",
  mid_career: "MID",
  emerging: "EMG",
};

interface InviteRow {
  artist_name: string;
  born: number | null;
  died: number | null;
  country: string;
  ranking: string;
  email: string;
  phone: string;
  studio_address: string;
  galleries: string[];
  cv_text: string;
  social_links: Record<string, string>;
  tier: Tier;
  notes: string;
  code: string;
}

interface SavedInvite {
  id: string;
  artist_name: string;
  born: number | null;
  died: number | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  studio_address: string | null;
  galleries: string[] | null;
  cv_text: string | null;
  social_links: Record<string, string> | null;
  website: string | null;
  bio: string | null;
  ranking: string | null;
  email_draft: string | null;
  enrichment_status: string | null;
  enriched_at: string | null;
  enrichment_sources: { urls?: string[]; used_firecrawl?: boolean } | null;
  tier: Tier;
  notes: string | null;
  status: string;
  created_at: string;
  invite_code_id: string | null;
  invite_codes?: { code: string } | null;
}

const generateCode = (tier: Tier) =>
  `FOUNDING-${tierPrefixes[tier]}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

const parseTier = (val: string): Tier => {
  const lower = (val || "").toLowerCase().trim();
  if (lower.includes("established") || lower.includes("international") || lower === "est") return "internationally_established";
  if (lower.includes("mid") || lower === "mid") return "mid_career";
  return "emerging";
};

const parseSocials = (raw: string): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!raw) return out;
  const urls = raw.split(/[\s,;]+/).filter((u) => /^https?:\/\//i.test(u));
  for (const url of urls) {
    if (/instagram\.com/i.test(url)) out.instagram = url;
    else if (/(twitter|x)\.com/i.test(url)) out.twitter = url;
    else if (/facebook\.com/i.test(url)) out.facebook = url;
    else if (/linkedin\.com/i.test(url)) out.linkedin = url;
    else if (/youtube\.com/i.test(url)) out.youtube = url;
    else if (/tiktok\.com/i.test(url)) out.tiktok = url;
    else out[`link${Object.keys(out).length + 1}`] = url;
  }
  return out;
};

const num = (v: any): number | null => {
  const n = parseInt(String(v ?? "").trim());
  return isNaN(n) ? null : n;
};

export default function ArtistInviteUpload() {
  const [preview, setPreview] = useState<InviteRow[]>([]);
  const [saved, setSaved] = useState<SavedInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [enriching, setEnriching] = useState<Set<string>>(new Set());
  const [drafting, setDrafting] = useState<Set<string>>(new Set());
  const [detailOpen, setDetailOpen] = useState<SavedInvite | null>(null);
  const [draftOpen, setDraftOpen] = useState<SavedInvite | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualTier, setManualTier] = useState<Tier>("emerging");

  const fetchSaved = async () => {
    const { data } = await supabase
      .from("artist_invites")
      .select("*, invite_codes(code)")
      .order("created_at", { ascending: false });
    if (data) setSaved(data as unknown as SavedInvite[]);
  };

  useEffect(() => { fetchSaved(); }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      const rows: InviteRow[] = json.map((row) => {
        const get = (...keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(row).find((rk) => rk.toLowerCase().trim() === k.toLowerCase());
            if (found && row[found] !== undefined && row[found] !== "") return String(row[found]).trim();
          }
          return "";
        };
        const galleries = [
          get("Representing gallery 1", "Gallery 1"),
          get("Representing gallery 2", "Gallery 2"),
          get("Representing gallery 3", "Gallery 3"),
          get("Representing gallery 4", "Gallery 4"),
        ].filter(Boolean);
        const tier = parseTier(get("Tier"));
        return {
          artist_name: get("Artist name", "Name", "artist_name"),
          born: num(get("Born", "Year of Birth", "birth_year")),
          died: num(get("Died")),
          country: get("Country"),
          ranking: get("Ranking"),
          email: get("Email"),
          phone: get("Phone"),
          studio_address: get("Studio address"),
          galleries,
          cv_text: get("CV"),
          social_links: parseSocials(get("Social media links", "Social media")),
          tier,
          notes: get("Notes"),
          code: generateCode(tier),
        };
      }).filter((r) => r.artist_name);

      setPreview(rows);
      toast.success(`Parsed ${rows.length} artist(s)`);
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    if (!preview.length) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: createdCodes, error: codeErr } = await supabase
      .from("invite_codes")
      .insert(preview.map((r) => ({ code: r.code, tier: r.tier, created_by: user.id })))
      .select("id, code");
    if (codeErr || !createdCodes) { toast.error("Failed to create invite codes"); setLoading(false); return; }
    const codeMap = new Map(createdCodes.map((c) => [c.code, c.id]));

    const inserts = preview.map((r) => ({
      artist_name: r.artist_name,
      born: r.born,
      died: r.died,
      country: r.country || null,
      ranking: r.ranking || null,
      email: r.email || null,
      phone: r.phone || null,
      studio_address: r.studio_address || null,
      galleries: r.galleries.length ? r.galleries : null,
      cv_text: r.cv_text || null,
      social_links: Object.keys(r.social_links).length ? r.social_links : null,
      tier: r.tier,
      notes: r.notes || null,
      invite_code_id: codeMap.get(r.code) || null,
      added_by: user.id,
    }));
    const { error } = await supabase.from("artist_invites").insert(inserts);
    if (error) toast.error("Failed to save: " + error.message);
    else { toast.success(`Imported ${preview.length} artist(s)`); setPreview([]); fetchSaved(); }
    setLoading(false);
  };

  const handleManualAdd = async () => {
    if (!manualName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const code = generateCode(manualTier);
    const { data: codeData } = await supabase.from("invite_codes")
      .insert({ code, tier: manualTier, created_by: user.id }).select("id").single();
    if (!codeData) { toast.error("Failed"); return; }
    const { error } = await supabase.from("artist_invites").insert({
      artist_name: manualName.trim(), email: manualEmail.trim() || null,
      tier: manualTier, invite_code_id: codeData.id, added_by: user.id,
    });
    if (error) { toast.error("Failed"); return; }
    toast.success("Added"); setManualName(""); setManualEmail(""); fetchSaved();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("artist_invites").delete().eq("id", id);
    if (!error) { setSaved((p) => p.filter((s) => s.id !== id)); toast.success("Removed"); }
  };

  const handleEnrich = async (id: string) => {
    setEnriching((s) => new Set(s).add(id));
    try {
      const { data, error } = await supabase.functions.invoke("enrich-artist", { body: { invite_id: id } });
      if (error || !data?.success) throw new Error(error?.message || data?.error || "Failed");
      toast.success(data.used_firecrawl ? "Enriched (web search)" : "Enriched");
      fetchSaved();
    } catch (e: any) {
      toast.error(e.message || "Enrichment failed");
    } finally {
      setEnriching((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const handleEnrichAll = async () => {
    const pending = saved.filter((s) => s.enrichment_status !== "completed" && s.enrichment_status !== "running");
    if (!pending.length) { toast.info("Nothing to enrich"); return; }
    toast.info(`Enriching ${pending.length} artists... this may take a few minutes`);
    for (const row of pending) {
      // sequential to avoid rate limits
      await handleEnrich(row.id);
    }
  };

  const handleGenerateDraft = async (row: SavedInvite) => {
    setDrafting((s) => new Set(s).add(row.id));
    try {
      const { data, error } = await supabase.functions.invoke("generate-invite-draft", {
        body: { invite_id: row.id },
      });
      if (error || !data?.success) throw new Error(error?.message || data?.error || "Failed");
      toast.success("Draft generated");
      await fetchSaved();
      setDraftOpen({ ...row, email_draft: data.draft });
    } catch (e: any) {
      toast.error(e.message || "Draft failed");
    } finally {
      setDrafting((s) => { const n = new Set(s); n.delete(row.id); return n; });
    }
  };

  const handleCopy = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const handleDownloadTemplate = () => {
    const headers = "Artist name,Born,Died,Country,Ranking,Email,Phone,Studio address,Representing gallery 1,Representing gallery 2,Representing gallery 3,Representing gallery 4,CV,Social media links,Tier,Notes";
    const sample = `Jane Doe,1985,,Germany,#234,jane@studio.com,,Berlin,Sprueth Magers,,,,"Solo: MoMA 2023; Tate 2022",https://instagram.com/janedoe,Mid-Career,Met at Frieze`;
    const blob = new Blob([headers + "\n" + sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "artist-invite-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const rows = saved.map((s) => [
      s.artist_name, s.born || "", s.died || "", s.country || "", s.ranking || "",
      s.email || "", s.phone || "", s.studio_address || "",
      (s.galleries || []).join(" | "),
      s.website || "",
      Object.entries(s.social_links || {}).map(([k, v]) => `${k}: ${v}`).join(" | "),
      tierLabels[s.tier], (s.invite_codes as any)?.code || "", s.status,
      s.enrichment_status || "", (s.bio || "").replace(/\n/g, " "),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = ["Name,Born,Died,Country,Ranking,Email,Phone,Studio,Galleries,Website,Socials,Tier,Code,Status,Enrichment,Bio", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `artist-invites-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = saved.filter((s) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return s.artist_name.toLowerCase().includes(q)
      || (s.email || "").toLowerCase().includes(q)
      || (s.country || "").toLowerCase().includes(q)
      || (s.galleries || []).some((g) => g.toLowerCase().includes(q));
  });

  const enrichmentBadge = (status: string | null) => {
    if (status === "completed") return <Badge variant="default" className="text-xs">Enriched</Badge>;
    if (status === "running") return <Badge variant="secondary" className="text-xs">Running…</Badge>;
    if (status === "failed") return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    return <Badge variant="outline" className="text-xs">Not yet</Badge>;
  };

  return (
    <div className="space-y-8">
      <section className="border border-border rounded-sm p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-medium">Import Artist List (ArtFacts export)</h2>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-3.5 w-3.5 mr-1" /> Template
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload an Excel/CSV with columns: <em>Artist name, Born, Died, Country, Ranking, Email, Phone, Studio address, Representing gallery 1–4, CV, Social media links</em>. Invite codes auto-generate. Use the Enrich action afterwards to auto-fill missing fields.
        </p>
        <Input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="max-w-xs" />

        {preview.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{preview.length} artist(s) ready:</p>
            <div className="border border-border rounded-sm overflow-auto max-h-64">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Born</TableHead><TableHead>Country</TableHead>
                  <TableHead>Email</TableHead><TableHead>Galleries</TableHead><TableHead>Code</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.artist_name}</TableCell>
                      <TableCell>{r.born || "—"}</TableCell>
                      <TableCell>{r.country || "—"}</TableCell>
                      <TableCell className="text-xs">{r.email || "—"}</TableCell>
                      <TableCell className="text-xs">{r.galleries.join(", ") || "—"}</TableCell>
                      <TableCell><code className="text-xs">{r.code}</code></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={loading}>
                <Upload className="h-4 w-4 mr-1" /> {loading ? "Importing..." : `Import ${preview.length}`}
              </Button>
              <Button variant="outline" onClick={() => setPreview([])}>Cancel</Button>
            </div>
          </div>
        )}
      </section>

      <section className="border border-border rounded-sm p-6 space-y-4">
        <h2 className="text-lg font-medium">Add Artist Manually</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div><Label>Name</Label><Input value={manualName} onChange={(e) => setManualName(e.target.value)} className="w-48 mt-1" autoComplete="off" /></div>
          <div><Label>Email</Label><Input value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="w-48 mt-1" autoComplete="off" /></div>
          <div><Label>Tier</Label>
            <Select value={manualTier} onValueChange={(v) => setManualTier(v as Tier)}>
              <SelectTrigger className="w-56 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(tierLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={handleManualAdd} disabled={!manualName.trim()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-medium">Tracked Artists ({saved.length})</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEnrichAll} disabled={enriching.size > 0}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Enrich all pending
            </Button>
            {saved.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="h-3.5 w-3.5 mr-1" /> Export
              </Button>
            )}
          </div>
        </div>

        {saved.length > 5 && (
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search..." className="pl-9" autoComplete="off" />
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invited artists yet.</p>
        ) : (
          <div className="border border-border rounded-sm overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Artist</TableHead>
                <TableHead>Born</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Galleries</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Enrichment</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const code = (s.invite_codes as any)?.code || "—";
                  const isEnriching = enriching.has(s.id);
                  const isDrafting = drafting.has(s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <button className="font-medium hover:underline text-left" onClick={() => setDetailOpen(s)}>
                          {s.artist_name}
                        </button>
                      </TableCell>
                      <TableCell>{s.born || "—"}</TableCell>
                      <TableCell>{s.country || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{(s.galleries || []).join(", ") || "—"}</TableCell>
                      <TableCell className="text-xs">{s.email || "—"}</TableCell>
                      <TableCell>{enrichmentBadge(s.enrichment_status)}</TableCell>
                      <TableCell>
                        {code !== "—" ? (
                          <button onClick={() => handleCopy(code, "Code copied")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            <code className="text-xs">{code}</code><Copy className="h-3 w-3" />
                          </button>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" disabled={isEnriching} onClick={() => handleEnrich(s.id)} title="Enrich with AI">
                            {isEnriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" disabled={isDrafting} onClick={() => handleGenerateDraft(s)} title="Generate invite email">
                            {isDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Detail dialog */}
      <Dialog open={!!detailOpen} onOpenChange={(o) => !o && setDetailOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailOpen && (
            <>
              <DialogHeader>
                <DialogTitle>{detailOpen.artist_name}</DialogTitle>
                <DialogDescription>
                  {[detailOpen.born, detailOpen.died].filter(Boolean).join("–") || ""} {detailOpen.country ? `· ${detailOpen.country}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                {detailOpen.bio && <div><Label className="text-xs">Bio</Label><p className="mt-1 text-muted-foreground whitespace-pre-wrap">{detailOpen.bio}</p></div>}
                {detailOpen.galleries?.length ? (
                  <div><Label className="text-xs">Galleries</Label>
                    <ul className="mt-1 list-disc list-inside text-muted-foreground">
                      {detailOpen.galleries.map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                  </div>
                ) : null}
                {detailOpen.website && (
                  <div><Label className="text-xs">Website</Label>
                    <a href={detailOpen.website} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-primary hover:underline">
                      {detailOpen.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {detailOpen.social_links && Object.keys(detailOpen.social_links).length > 0 && (
                  <div><Label className="text-xs">Social</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Object.entries(detailOpen.social_links).map(([k, v]) => (
                        <a key={k} href={v} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 border rounded hover:bg-muted">{k}</a>
                      ))}
                    </div>
                  </div>
                )}
                {detailOpen.cv_text && <div><Label className="text-xs">CV</Label><p className="mt-1 text-muted-foreground whitespace-pre-wrap text-xs">{detailOpen.cv_text}</p></div>}
                {(detailOpen.email || detailOpen.phone || detailOpen.studio_address) && (
                  <div><Label className="text-xs">Contact</Label>
                    <div className="mt-1 text-muted-foreground space-y-0.5">
                      {detailOpen.email && <div>📧 {detailOpen.email}</div>}
                      {detailOpen.phone && <div>📞 {detailOpen.phone}</div>}
                      {detailOpen.studio_address && <div>📍 {detailOpen.studio_address}</div>}
                    </div>
                  </div>
                )}
                {detailOpen.enrichment_sources?.urls?.length ? (
                  <div><Label className="text-xs">Sources</Label>
                    <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      {detailOpen.enrichment_sources.urls.slice(0, 8).map((u, i) => (
                        <li key={i}><a href={u} target="_blank" rel="noreferrer" className="hover:underline truncate block">{u}</a></li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Draft dialog */}
      <Dialog open={!!draftOpen} onOpenChange={(o) => !o && setDraftOpen(null)}>
        <DialogContent className="max-w-2xl">
          {draftOpen && (
            <>
              <DialogHeader>
                <DialogTitle>Invite draft — {draftOpen.artist_name}</DialogTitle>
                <DialogDescription>
                  Copy and send from your own email client. To: {draftOpen.email || "(no email on file)"}
                </DialogDescription>
              </DialogHeader>
              <Textarea value={draftOpen.email_draft || ""} readOnly rows={18} className="font-mono text-xs" />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => handleCopy(draftOpen.email_draft || "", "Draft copied")}>
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
                <Button onClick={() => handleGenerateDraft(draftOpen)} disabled={drafting.has(draftOpen.id)}>
                  <Sparkles className="h-4 w-4 mr-1" /> Regenerate
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
