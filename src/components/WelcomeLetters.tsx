import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

interface Letter {
  id: string;
  user_id: string;
  status: string;
  discovered_website: string | null;
  subject: string | null;
  body: string | null;
  sent_at: string | null;
  created_at: string;
}

interface Person {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

type Row = Letter & { full_name: string | null; email: string | null };

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export default function WelcomeLetters() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<Row | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showSent, setShowSent] = useState(false);

  const load = async () => {
    const { data: letters } = await supabase
      .from("welcome_letters")
      .select("id, user_id, status, discovered_website, subject, body, sent_at, created_at")
      .order("created_at", { ascending: false });

    const list = (letters ?? []) as Letter[];
    if (list.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: people } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", list.map((l) => l.user_id));

    const byId = new Map((people ?? []).map((p: Person) => [p.user_id, p]));
    setRows(
      list.map((l) => ({
        ...l,
        full_name: byId.get(l.user_id)?.full_name ?? null,
        email: byId.get(l.user_id)?.email ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () => rows.filter((r) => (showSent ? true : r.status !== "sent" && r.status !== "skipped")),
    [rows, showSent],
  );
  const waiting = rows.filter((r) => r.status !== "sent" && r.status !== "skipped").length;

  const prepare = async (row: Row) => {
    setBusy(row.user_id);
    const { data, error } = await supabase.functions.invoke("prepare-welcome-letter", {
      body: { user_id: row.user_id },
    });
    setBusy(null);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || "Could not prepare the letter");
      return;
    }
    await load();
    const prepared = data as { subject: string; body: string };
    setOpen(row);
    setSubject(prepared.subject);
    setBody(prepared.body);
  };

  const read = (row: Row) => {
    setOpen(row);
    setSubject(row.subject ?? "");
    setBody(row.body ?? "");
  };

  const save = async () => {
    if (!open) return;
    setBusy(open.user_id);
    const { error } = await supabase
      .from("welcome_letters")
      .update({ subject, body, status: "drafted" })
      .eq("user_id", open.user_id);
    setBusy(null);
    if (error) {
      toast.error("Could not save");
      return;
    }
    toast.success("Saved for later");
    setOpen(null);
    load();
  };

  const skip = async (row: Row) => {
    setBusy(row.user_id);
    await supabase.from("welcome_letters").update({ status: "skipped" }).eq("user_id", row.user_id);
    setBusy(null);
    setOpen(null);
    load();
  };

  const send = async () => {
    if (!open) return;
    setBusy(open.user_id);
    const { data, error } = await supabase.functions.invoke("send-welcome-letter", {
      body: { user_id: open.user_id, subject, body },
    });
    setBusy(null);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || "Could not send the letter");
      return;
    }
    toast.success("Welcome letter sent");
    setOpen(null);
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading welcome letters…</p>;

  return (
    <section>
      <div className="flex items-center gap-3 mb-1">
        <Mail className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Welcome letters</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {waiting} artist{waiting === 1 ? "" : "s"} waiting for a welcome letter. Nothing is sent until you
        read it and press Send.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <Button variant={showSent ? "outline" : "default"} size="sm" onClick={() => setShowSent(false)}>
          Waiting ({waiting})
        </Button>
        <Button variant={showSent ? "default" : "outline"} size="sm" onClick={() => setShowSent(true)}>
          Everyone ({rows.length})
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody in this group right now.</p>
      ) : (
        <div className="border border-border rounded-sm overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artist</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Website found</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Letter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="font-medium block">{r.full_name || "—"}</span>
                    <span className="text-xs text-muted-foreground">{r.email || "—"}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {daysSince(r.created_at) === 0 ? "Today" : `${daysSince(r.created_at)} d ago`}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.discovered_website ? (
                      <a
                        href={r.discovered_website}
                        target="_blank"
                        rel="noreferrer"
                        className="underline break-all"
                      >
                        {r.discovered_website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    ) : r.status === "queued" ? (
                      <span className="text-muted-foreground">Not looked up yet</span>
                    ) : (
                      <span className="text-muted-foreground">No website found</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.status === "sent" ? (
                      <Badge variant="outline">
                        Sent{r.sent_at ? ` ${new Date(r.sent_at).toLocaleDateString()}` : ""}
                      </Badge>
                    ) : r.status === "skipped" ? (
                      <Badge variant="outline">Skipped</Badge>
                    ) : r.status === "drafted" ? (
                      <Badge variant="outline">Ready to read</Badge>
                    ) : (
                      <Badge variant="outline">Queued</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {r.status === "queued" ? (
                      <Button size="sm" disabled={busy === r.user_id} onClick={() => prepare(r)}>
                        {busy === r.user_id ? "Preparing…" : "Prepare"}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === r.user_id}
                          onClick={() => prepare(r)}
                          aria-label="Look up the website again"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => read(r)}>
                          {r.status === "sent" ? "Read" : "Read and send"}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Letter to {open?.full_name || open?.email || "artist"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={18}
              className="font-sans text-sm"
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!open || busy === open.user_id}
                onClick={() => open && skip(open)}
              >
                Skip this artist
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={!!busy} onClick={save}>
                  Save for later
                </Button>
                <Button size="sm" disabled={!!busy || open?.status === "sent"} onClick={send}>
                  <Send className="h-3.5 w-3.5 mr-2" />
                  {open?.status === "sent" ? "Already sent" : busy ? "Sending…" : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
