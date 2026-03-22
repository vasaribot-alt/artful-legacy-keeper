import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, Plus, Trash2, Copy, Download, Search } from "lucide-react";
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
  birth_year: number | null;
  city: string;
  country: string;
  email: string;
  tier: Tier;
  notes: string;
  code: string;
}

interface SavedInvite {
  id: string;
  artist_name: string;
  birth_year: number | null;
  city: string | null;
  country: string | null;
  email: string | null;
  tier: Tier;
  notes: string | null;
  status: string;
  created_at: string;
  invite_code_id: string | null;
  invite_codes?: { code: string } | null;
}

const generateCode = (tier: Tier): string => {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FOUNDING-${tierPrefixes[tier]}-${random}`;
};

const parseTier = (val: string): Tier => {
  const lower = (val || "").toLowerCase().trim();
  if (lower.includes("established") || lower.includes("international") || lower === "est") return "internationally_established";
  if (lower.includes("mid") || lower === "mid") return "mid_career";
  return "emerging";
};

export default function ArtistInviteUpload() {
  const [preview, setPreview] = useState<InviteRow[]>([]);
  const [saved, setSaved] = useState<SavedInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Manual add state
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

  // Load on mount
  useState(() => { fetchSaved(); });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

      const rows: InviteRow[] = json.map((row) => {
        const name = row["Artist Name"] || row["artist_name"] || row["Name"] || row["name"] || "";
        const email = row["Email"] || row["email"] || "";
        const city = row["City"] || row["city"] || "";
        const country = row["Country"] || row["country"] || "";
        const birthYear = parseInt(row["Year of Birth"] || row["birth_year"] || row["Birth Year"] || "");
        const tierVal = row["Tier"] || row["tier"] || "";
        const notes = row["Notes"] || row["notes"] || "";
        const tier = parseTier(tierVal);

        return {
          artist_name: name.trim(),
          birth_year: isNaN(birthYear) ? null : birthYear,
          city: city.trim(),
          country: country.trim(),
          email: email.trim(),
          tier,
          notes: notes.trim(),
          code: generateCode(tier),
        };
      }).filter((r) => r.artist_name);

      setPreview(rows);
      toast.success(`Parsed ${rows.length} artist(s) from file`);
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Create invite codes first
    const codeInserts = preview.map((r) => ({
      code: r.code,
      tier: r.tier,
      created_by: user.id,
    }));

    const { data: createdCodes, error: codeErr } = await supabase
      .from("invite_codes")
      .insert(codeInserts)
      .select("id, code");

    if (codeErr || !createdCodes) {
      toast.error("Failed to create invite codes");
      setLoading(false);
      return;
    }

    const codeMap = new Map(createdCodes.map((c) => [c.code, c.id]));

    const inviteInserts = preview.map((r) => ({
      artist_name: r.artist_name,
      birth_year: r.birth_year,
      city: r.city || null,
      country: r.country || null,
      email: r.email || null,
      tier: r.tier,
      notes: r.notes || null,
      invite_code_id: codeMap.get(r.code) || null,
      added_by: user.id,
    }));

    const { error } = await supabase.from("artist_invites").insert(inviteInserts);
    if (error) {
      toast.error("Failed to save artist invites");
    } else {
      toast.success(`Imported ${preview.length} artist(s) with invite codes`);
      setPreview([]);
      fetchSaved();
    }
    setLoading(false);
  };

  const handleManualAdd = async () => {
    if (!manualName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const code = generateCode(manualTier);
    const { data: codeData, error: codeErr } = await supabase
      .from("invite_codes")
      .insert({ code, tier: manualTier, created_by: user.id })
      .select("id")
      .single();

    if (codeErr || !codeData) { toast.error("Failed to create code"); return; }

    const { error } = await supabase.from("artist_invites").insert({
      artist_name: manualName.trim(),
      email: manualEmail.trim() || null,
      tier: manualTier,
      invite_code_id: codeData.id,
      added_by: user.id,
    });

    if (error) { toast.error("Failed to add artist"); return; }
    toast.success("Artist added");
    setManualName("");
    setManualEmail("");
    fetchSaved();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("artist_invites").delete().eq("id", id);
    if (!error) {
      setSaved((prev) => prev.filter((s) => s.id !== id));
      toast.success("Removed");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

  const handleExportCsv = () => {
    const rows = saved.map((s) => [
      s.artist_name,
      s.birth_year || "",
      s.city || "",
      s.country || "",
      s.email || "",
      tierLabels[s.tier],
      (s.invite_codes as any)?.code || "",
      s.status,
      s.notes || "",
      new Date(s.created_at).toLocaleDateString(),
    ].map((v) => `"${v}"`).join(","));
    const csv = ["Artist Name,Birth Year,City,Country,Email,Tier,Code,Status,Notes,Added", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artist-invites-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const csv = "Artist Name,Year of Birth,City,Country,Email,Tier,Notes\nJane Doe,1985,Berlin,Germany,jane@example.com,Mid-Career,Met at Frieze";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "artist-invite-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = saved.filter((s) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return s.artist_name.toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q) || (s.city || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <section className="border border-border rounded-sm p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-medium">Import Artist List</h2>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-3.5 w-3.5 mr-1" /> Download Template
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload a CSV or Excel file with columns: Artist Name, Year of Birth, City, Country, Email, Tier, Notes. Invite codes will be auto-generated.
        </p>
        <div className="flex gap-3 items-center">
          <Input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="max-w-xs" />
        </div>

        {preview.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{preview.length} artist(s) ready to import:</p>
            <div className="border border-border rounded-sm overflow-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.artist_name}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{r.city}{r.country ? `, ${r.country}` : ""}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{tierLabels[r.tier]}</Badge></TableCell>
                      <TableCell><code className="text-xs font-mono">{r.code}</code></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={loading}>
                <Upload className="h-4 w-4 mr-1" /> {loading ? "Importing..." : `Import ${preview.length} Artist(s)`}
              </Button>
              <Button variant="outline" onClick={() => setPreview([])}>Cancel</Button>
            </div>
          </div>
        )}
      </section>

      {/* Manual Add */}
      <section className="border border-border rounded-sm p-6 space-y-4">
        <h2 className="text-lg font-medium">Add Artist Manually</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label>Name</Label>
            <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Artist name" className="w-48 mt-1" autoComplete="off" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="Email" className="w-48 mt-1" autoComplete="off" />
          </div>
          <div>
            <Label>Tier</Label>
            <Select value={manualTier} onValueChange={(v) => setManualTier(v as Tier)}>
              <SelectTrigger className="w-56 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(tierLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleManualAdd} disabled={!manualName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </section>

      {/* Saved List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-medium">Invited Artists ({saved.length})</h2>
          <div className="flex gap-2">
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
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search artists..." className="pl-9" autoComplete="off" />
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invited artists yet. Upload a CSV or add manually above.</p>
        ) : (
          <div className="border border-border rounded-sm overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artist</TableHead>
                  <TableHead>Birth Year</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Invite Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const code = (s.invite_codes as any)?.code || "—";
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.artist_name}</TableCell>
                      <TableCell>{s.birth_year || "—"}</TableCell>
                      <TableCell>{[s.city, s.country].filter(Boolean).join(", ") || "—"}</TableCell>
                      <TableCell>{s.email || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{tierLabels[s.tier]}</Badge></TableCell>
                      <TableCell>
                        {code !== "—" ? (
                          <button onClick={() => handleCopyCode(code)} className="flex items-center gap-1 hover:text-foreground text-muted-foreground transition-colors">
                            <code className="text-xs font-mono">{code}</code>
                            <Copy className="h-3 w-3" />
                          </button>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === "registered" ? "default" : "secondary"} className="text-xs">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
