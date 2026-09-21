import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, LifeBuoy, Minus, Send } from "lucide-react";
import { toast } from "sonner";

type AccountRole = "artist" | "collector" | "registrar";
type Filter = "recent" | "stuck" | "all";

interface Row {
  user_id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  id_verified: boolean;
  has_biography: boolean;
  has_avatar: boolean;
  roles: string[] | null;
  artist_artworks: number;
  artist_artworks_with_image: number;
  collector_artworks: number;
  collector_artworks_with_image: number;
  exhibitions: number;
  cv_entries: number;
  website_enabled: boolean;
  discovered_website: string | null;
  letter_status: string | null;
  letter_subject: string | null;
  letter_body: string | null;
  letter_sent_at: string | null;
  letter_role: string | null;
  collector_has_registrar: boolean;
  registrar_verified: boolean;
  registrar_profile_complete: boolean;
  registrar_available: boolean;
  registrar_has_cv: boolean;
  registrar_clients: number;
}

interface Step {
  label: string;
  done: (row: Row) => boolean;
}

const STEPS: Record<AccountRole, Step[]> = {
  artist: [
    { label: "Verified", done: (row) => row.id_verified },
    { label: "Biography", done: (row) => row.has_biography },
    { label: "Works", done: (row) => row.artist_artworks > 0 },
    { label: "Photos", done: (row) => row.artist_artworks_with_image > 0 },
    { label: "Exhibitions", done: (row) => row.exhibitions > 0 },
    { label: "CV", done: (row) => row.cv_entries > 0 },
    { label: "GARF site", done: (row) => row.website_enabled },
  ],
  collector: [
    { label: "Verified", done: (row) => row.id_verified },
    { label: "Profile", done: (row) => row.has_avatar || row.has_biography },
    { label: "Works", done: (row) => row.collector_artworks > 0 },
    { label: "Photos", done: (row) => row.collector_artworks_with_image > 0 },
    { label: "Registrar", done: (row) => row.collector_has_registrar },
  ],
  registrar: [
    { label: "Verified", done: (row) => row.registrar_verified },
    { label: "Profile", done: (row) => row.registrar_profile_complete },
    { label: "Available", done: (row) => row.registrar_available },
    { label: "CV", done: (row) => row.registrar_has_cv },
    { label: "Clients", done: (row) => row.registrar_clients > 0 },
  ],
};

const ROLE_LABELS: Record<AccountRole, string> = {
  artist: "Artists",
  collector: "Collectors",
  registrar: "Registrars",
};

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export default function OnboardingTracker() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AccountRole>("artist");
  const [filter, setFilter] = useState<Filter>("recent");
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<Row | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    const { data, error } = await supabase.rpc("get_onboarding_progress");
    if (error) toast.error("Could not load getting started");
    if (data) setRows(data as unknown as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const roleRows = useMemo(() => rows.filter((row) => row.roles?.includes(role)), [rows, role]);
  const steps = STEPS[role];
  const progress = (row: Row) => steps.filter((step) => step.done(row)).length;
  const needsHelp = (row: Row) => progress(row) <= 1 && daysSince(row.created_at) >= 1;
  const stuckCount = roleRows.filter(needsHelp).length;
  const newThisWeek = roleRows.filter((row) => daysSince(row.created_at) <= 7).length;

  const filtered = useMemo(() => {
    if (filter === "recent") return roleRows.filter((row) => daysSince(row.created_at) <= 30);
    if (filter === "stuck") return roleRows.filter(needsHelp);
    return roleRows;
  }, [filter, roleRows, steps]);

  const prepare = async (row: Row) => {
    setBusy(row.user_id);
    const { data, error } = await supabase.functions.invoke("prepare-welcome-letter", {
      body: { user_id: row.user_id },
    });
    setBusy(null);
    const prepared = data as { subject?: string; body?: string; error?: string } | null;
    if (error || prepared?.error || !prepared?.subject || !prepared.body) {
      toast.error(prepared?.error || "Could not prepare the letter");
      return;
    }
    setOpen(row);
    setSubject(prepared.subject);
    setBody(prepared.body);
    await load();
  };

  const read = (row: Row) => {
    setOpen(row);
    setSubject(row.letter_subject ?? "");
    setBody(row.letter_body ?? "");
  };

  const save = async () => {
    if (!open) return;
    setBusy(open.user_id);
    const { error } = await supabase.from("welcome_letters").update({ subject, body, status: "drafted" }).eq("user_id", open.user_id);
    setBusy(null);
    if (error) {
      toast.error("Could not save the letter");
      return;
    }
    toast.success("Saved for later");
    setOpen(null);
    await load();
  };

  const skip = async () => {
    if (!open) return;
    setBusy(open.user_id);
    const { error } = await supabase.from("welcome_letters").update({ status: "skipped" }).eq("user_id", open.user_id);
    setBusy(null);
    if (error) {
      toast.error("Could not skip the letter");
      return;
    }
    setOpen(null);
    await load();
  };

  const send = async () => {
    if (!open) return;
    setBusy(open.user_id);
    const { data, error } = await supabase.functions.invoke("send-welcome-letter", {
      body: { user_id: open.user_id, subject, body },
    });
    setBusy(null);
    const result = data as { error?: string } | null;
    if (error || result?.error) {
      toast.error(result?.error || "Could not send the letter");
      return;
    }
    toast.success("Welcome letter sent");
    setOpen(null);
    await load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading getting started…</p>;

  return (
    <section>
      <div className="flex items-center gap-3 mb-1">
        <LifeBuoy className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Getting started and welcome letters</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {newThisWeek} {ROLE_LABELS[role].toLowerCase()} joined in the last seven days. {stuckCount} may need a hand.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {(Object.keys(ROLE_LABELS) as AccountRole[]).map((value) => (
          <Button key={value} variant={role === value ? "default" : "outline"} size="sm" onClick={() => setRole(value)}>
            {ROLE_LABELS[value]} ({rows.filter((row) => row.roles?.includes(value)).length})
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {([
          ["recent", "Last 30 days"],
          ["stuck", `Needs help (${stuckCount})`],
          ["all", `Everyone (${roleRows.length})`],
        ] as [Filter, string][]).map(([value, label]) => (
          <Button key={value} variant={filter === value ? "secondary" : "outline"} size="sm" onClick={() => setFilter(value)}>
            {label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody in this group right now.</p>
      ) : (
        <div className="border border-border rounded-sm overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Progress</TableHead>
                {steps.map((step) => <TableHead key={step.label} className="text-center text-xs">{step.label}</TableHead>)}
                {role === "artist" && <TableHead>Artist URL</TableHead>}
                <TableHead className="text-right">Welcome letter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const done = progress(row);
                return (
                  <TableRow key={row.user_id} className={needsHelp(row) ? "bg-secondary/40" : ""}>
                    <TableCell>
                      <span className="font-medium block">{row.full_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">{row.email || "—"}{row.country ? ` · ${row.country}` : ""}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {daysSince(row.created_at) === 0 ? "Today" : `${daysSince(row.created_at)} d ago`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="text-sm">{done}/{steps.length}</span>
                      {needsHelp(row) && <Badge variant="outline" className="ml-2 text-xs">Needs help</Badge>}
                    </TableCell>
                    {steps.map((step) => (
                      <TableCell key={step.label} className="text-center">
                        {step.done(row) ? <Check className="h-4 w-4 mx-auto" aria-label="Done" /> : <Minus className="h-4 w-4 mx-auto text-muted-foreground/40" aria-label="Not yet" />}
                      </TableCell>
                    ))}
                    {role === "artist" && (
                      <TableCell className="text-sm max-w-40">
                        {row.discovered_website ? (
                          <a href={row.discovered_website} target="_blank" rel="noreferrer" className="underline break-all">
                            {row.discovered_website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          </a>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-right whitespace-nowrap">
                      {!row.letter_status ? (
                        <span className="text-xs text-muted-foreground">Not queued</span>
                      ) : row.letter_status === "queued" ? (
                        <Button size="sm" disabled={busy === row.user_id} onClick={() => prepare(row)}>
                          {busy === row.user_id ? "Preparing…" : "Prepare"}
                        </Button>
                      ) : row.letter_status === "drafted" ? (
                        <Button size="sm" variant="outline" onClick={() => read(row)}>Read and send</Button>
                      ) : row.letter_status === "sent" ? (
                        <Button size="sm" variant="ghost" onClick={() => read(row)}>Welcomed ✓</Button>
                      ) : (
                        <Badge variant="outline">Skipped</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Letter to {open?.full_name || open?.email || "member"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" autoComplete="off" />
            <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={18} className="font-sans text-sm" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" size="sm" disabled={!open || !!busy || open?.letter_status === "sent"} onClick={skip}>Skip</Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={!!busy || open?.letter_status === "sent"} onClick={save}>Save for later</Button>
                <Button size="sm" disabled={!!busy || open?.letter_status === "sent"} onClick={send}>
                  <Send className="h-3.5 w-3.5 mr-2" />
                  {open?.letter_status === "sent" ? "Already sent" : busy ? "Sending…" : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}