import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Download, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

interface Signatory {
  id: string;
  full_name: string;
  email: string;
  country: string | null;
  signatory_type: string | null;
  organisation: string | null;
  comment: string | null;
  is_public: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  collector: "Collector",
  artist: "Artist",
  curator: "Curator",
  gallery: "Gallery",
  institution: "Institution",
  other: "Other",
};

const csvCell = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;

export default function StatementSignatories() {
  const [rows, setRows] = useState<Signatory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [visibility, setVisibility] = useState<"all" | "public" | "private">("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("statement_signatories")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Could not load signatories");
      } else {
        setRows((data ?? []) as Signatory[]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.signatory_type !== typeFilter) return false;
      if (visibility === "public" && !r.is_public) return false;
      if (visibility === "private" && r.is_public) return false;
      if (!q) return true;
      return [r.full_name, r.email, r.organisation, r.country]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [rows, query, typeFilter, visibility]);

  const totals = useMemo(() => ({
    total: rows.length,
    publicCount: rows.filter((r) => r.is_public).length,
    countries: new Set(rows.map((r) => r.country).filter(Boolean)).size,
    withComment: rows.filter((r) => r.comment && r.comment.trim()).length,
  }), [rows]);

  const exportCsv = () => {
    const header = ["Name", "Email", "Type", "Organisation", "Country", "Public", "Comment", "Signed"];
    const lines = filtered.map((r) => [
      csvCell(r.full_name),
      csvCell(r.email),
      csvCell(r.signatory_type),
      csvCell(r.organisation),
      csvCell(r.country),
      csvCell(r.is_public ? "yes" : "no"),
      csvCell(r.comment),
      csvCell(format(new Date(r.created_at), "yyyy-MM-dd HH:mm")),
    ].join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-signatories-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif">Statement of Support</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Everyone who has signed the statement, including those who chose not to be listed publicly.
            </p>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Signatures" value={String(totals.total)} />
          <StatCard label="Listed publicly" value={String(totals.publicCount)} />
          <StatCard label="Countries" value={String(totals.countries)} />
          <StatCard label="With a comment" value={String(totals.withComment)} />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, organisation, country…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.keys(TYPE_LABELS).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as "all" | "public" | "private")}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Public and private</SelectItem>
              <SelectItem value="public">Listed publicly</SelectItem>
              <SelectItem value="private">Not listed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {rows.length === 0 ? "No one has signed yet." : "No signatures match your filters."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Signatory</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Country</th>
                  <th className="text-left px-4 py-3">Listing</th>
                  <th className="text-left px-4 py-3">Signed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.organisation ? `${r.organisation} · ` : ""}{r.email}
                      </div>
                      {r.comment && (
                        <div className="text-xs text-muted-foreground mt-1 italic max-w-md">“{r.comment}”</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.signatory_type ? (
                        <Badge variant="outline">{TYPE_LABELS[r.signatory_type] ?? r.signatory_type}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{r.country || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        {r.is_public ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {r.is_public ? "Public" : "Private"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {format(new Date(r.created_at), "d MMM yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-serif mt-1">{value}</div>
    </div>
  );
}
