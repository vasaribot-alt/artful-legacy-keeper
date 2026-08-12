import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, RefreshCw } from "lucide-react";

interface LogRow {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  delivered_at: string | null;
  first_opened_at: string | null;
  last_opened_at: string | null;
  open_count: number | null;
  first_clicked_at: string | null;
  click_count: number | null;
  bounced_at: string | null;
  unsubscribed_at: string | null;
  last_event: string | null;
  last_event_at: string | null;
}


type Preset = "24h" | "7d" | "30d" | "custom";
const PAGE_SIZE = 50;

const statusVariant = (status: string) => {
  if (status === "sent") return "bg-foreground text-background";
  if (status === "failed" || status === "dlq" || status === "bounced") return "bg-destructive text-destructive-foreground";
  return "bg-muted text-muted-foreground";
};

export default function EmailLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<LogRow | null>(null);

  const range = useMemo(() => {
    const now = new Date();
    if (preset === "custom") {
      return {
        from: customFrom ? new Date(customFrom).toISOString() : new Date(0).toISOString(),
        to: customTo ? new Date(`${customTo}T23:59:59`).toISOString() : now.toISOString(),
      };
    }
    const hours = preset === "24h" ? 24 : preset === "7d" ? 24 * 7 : 24 * 30;
    return { from: new Date(now.getTime() - hours * 3600 * 1000).toISOString(), to: now.toISOString() };
  }, [preset, customFrom, customTo]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_send_log")
      .select("*")
      .gte("created_at", range.from)
      .lte("created_at", range.to)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) {
      toast.error("Could not load the email log.");
      setRows([]);
    } else {
      setRows((data as unknown as LogRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); setPage(0); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [range.from, range.to]);

  // Deduplicate by message_id — keep the latest row per email.
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    const out: LogRow[] = [];
    for (const r of rows) {
      const key = r.message_id || r.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }, [rows]);

  const templates = useMemo(
    () => Array.from(new Set(deduped.map(r => r.template_name))).sort(),
    [deduped],
  );

  const filtered = useMemo(() => deduped.filter(r => {
    if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "failed" ? !["failed", "dlq", "bounced"].includes(r.status) : r.status !== statusFilter) return false;
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const subject = String((r.metadata as any)?.subject || "");
      if (!r.recipient_email.toLowerCase().includes(needle) && !subject.toLowerCase().includes(needle)) return false;
    }
    return true;
  }), [deduped, templateFilter, statusFilter, q]);

  const stats = useMemo(() => {
    const sent = filtered.filter(r => r.status === "sent").length;
    const opened = filtered.filter(r => !!r.first_opened_at).length;
    const clicked = filtered.filter(r => !!r.first_clicked_at).length;
    return {
      total: filtered.length,
      sent,
      failed: filtered.filter(r => ["failed", "dlq", "bounced"].includes(r.status)).length,
      suppressed: filtered.filter(r => r.status === "suppressed").length,
      opened,
      clicked,
      openRate: sent ? Math.round((opened / sent) * 100) : 0,
      clickRate: sent ? Math.round((clicked / sent) * 100) : 0,
    };
  }, [filtered]);


  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const [enabling, setEnabling] = useState(false);
  const enableTracking = async () => {
    setEnabling(true);
    const { data, error } = await supabase.functions.invoke("brevo-register-webhook");
    setEnabling(false);
    if (error) {
      toast.error("Could not switch on read tracking. Check the Brevo connection.");
      return;
    }
    toast.success((data as any)?.updated ? "Read tracking refreshed." : "Read tracking is now switched on.");
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif">Email log</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every letter sent from the app, including outreach batches. Click a row to read the letter that went out —
              opens and link clicks appear here once tracking is switched on.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={enableTracking} disabled={enabling}>
              {enabling ? "Switching on…" : "Enable read tracking"}
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>


        {/* Time range */}
        <div className="flex flex-wrap items-center gap-2">
          {([["24h", "Last 24h"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["custom", "Custom"]] as [Preset, string][]).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={preset === value ? "default" : "outline"}
              onClick={() => setPreset(value)}
            >
              {label}
            </Button>
          ))}
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-40" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-40" />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All email types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All email types</SelectItem>
              {templates.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="suppressed">Suppressed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search recipient or subject"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0); }}
            className="w-72"
            autoComplete="off"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {([
            ["Total emails", stats.total, null],
            ["Sent", stats.sent, null],
            ["Opened", stats.opened, `${stats.openRate}% of sent`],
            ["Clicked", stats.clicked, `${stats.clickRate}% of sent`],
            ["Failed", stats.failed, null],
            ["Suppressed", stats.suppressed, null],
          ] as [string, number, string | null][]).map(([label, value, hint]) => (
            <div key={label} className="border rounded-lg p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="text-2xl font-serif mt-1">{value}</div>
              {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Recipient</th>
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Opened</th>
                <th className="px-3 py-2 font-medium">Clicked</th>
                <th className="px-3 py-2 font-medium">Sent</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No emails in this period.</td></tr>
              )}
              {pageRows.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-3 py-2 whitespace-nowrap">{r.template_name}</td>
                  <td className="px-3 py-2">{r.recipient_email}</td>
                  <td className="px-3 py-2 max-w-[22rem] truncate">{String((r.metadata as any)?.subject || "—")}</td>
                  <td className="px-3 py-2">
                    <Badge className={statusVariant(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.first_opened_at
                      ? <Badge className="bg-foreground text-background">{r.open_count && r.open_count > 1 ? `${r.open_count}×` : "Yes"}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.first_clicked_at
                      ? <Badge className="bg-foreground text-background">{r.click_count && r.click_count > 1 ? `${r.click_count}×` : "Yes"}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page + 1} of {pageCount}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <Mail className="h-4 w-4" /> {String((selected?.metadata as any)?.subject || "Letter")}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto space-y-3 text-sm">
            <div className="text-muted-foreground space-y-1">
              <div>To: {selected?.recipient_email}</div>
              <div>From: {String((selected?.metadata as any)?.from_email || "—")}</div>
              <div>Sent: {selected ? new Date(selected.created_at).toLocaleString() : ""}</div>
              {selected?.delivered_at && <div>Delivered: {new Date(selected.delivered_at).toLocaleString()}</div>}
              <div>
                Opened: {selected?.first_opened_at
                  ? `${new Date(selected.first_opened_at).toLocaleString()}${selected.open_count && selected.open_count > 1 ? ` (${selected.open_count} times, last ${new Date(selected.last_opened_at || selected.first_opened_at).toLocaleString()})` : ""}`
                  : "not yet registered"}
              </div>
              <div>
                Clicked a link: {selected?.first_clicked_at
                  ? `${new Date(selected.first_clicked_at).toLocaleString()}${selected.click_count && selected.click_count > 1 ? ` (${selected.click_count} times)` : ""}`
                  : "no"}
              </div>
              {selected?.bounced_at && <div className="text-destructive">Bounced: {new Date(selected.bounced_at).toLocaleString()}</div>}
              {selected?.unsubscribed_at && <div>Unsubscribed: {new Date(selected.unsubscribed_at).toLocaleString()}</div>}

              {Array.isArray((selected?.metadata as any)?.attachments) && ((selected?.metadata as any).attachments as string[]).length > 0 && (
                <div>Attachments: {((selected?.metadata as any).attachments as string[]).join(", ")}</div>
              )}
              {selected?.error_message && <div className="text-destructive">Error: {selected.error_message}</div>}
            </div>
            <div
              className="border rounded p-4 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: String((selected?.metadata as any)?.body_html || "<p>No copy stored for this email.</p>") }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
