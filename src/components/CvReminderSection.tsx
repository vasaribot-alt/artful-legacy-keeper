import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Artist {
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

const DEFAULT_SUBJECT = "Your CV and exhibitions — keeping them in one place";

const DEFAULT_BODY = `Dear artist,

Many artists on GARF have uploaded works and photos, but only a few have added their CV and exhibition history so far. If you're one of them, this is a gentle nudge.

Your CV is one of the most important parts of your archive — it's the record of your career that galleries, museums and researchers look for, and it belongs alongside your works in one permanent place. The good news is that you don't need to retype it from scratch: paste your website address into the Research page and we'll gather your biography, CV and exhibitions into a review list you approve item by item.

Once your CV is in, you don't need to keep it anywhere else. You can maintain it directly within your profile — add a new exhibition, edit a venue, correct a date — and it stays in sync with your works and your public website. One record, always up to date, for as long as the archive exists.

If you'd like a hand getting started, just reply to this email and I'll help personally.

With kind regards,

Jan S Kindem
Founder, Global Artist Registry Foundation
jan@globalartistregistry.org
+47 94235177`;

const SIGNATURE_EMAIL = "jan@globalartistregistry.org";

function personalise(body: string, name: string | null): string {
  if (!name) return body.replace(/^Dear artist,/, "Dear artist,");
  const first = name.split(/\s+/)[0];
  return body.replace(/^Dear artist,/, `Dear ${first},`);
}

function bodyToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 18px;line-height:1.65">${p
          .replace(/\n/g, "<br />")
          .replace(/jan@globalartistregistry\.org/g, '<a href="mailto:jan@globalartistregistry.org" style="color:#0a0a0a;text-decoration:underline;">jan@globalartistregistry.org</a>')
          .replace(/globalartistregistry\.org/g, '<a href="https://globalartistregistry.org" style="color:#0a0a0a;text-decoration:underline;">globalartistregistry.org</a>')
          .replace(/Research page/g, '<a href="https://globalartistregistry.org/research" style="color:#0a0a0a;text-decoration:underline;">Research page</a>')}</p>`,
    )
    .join("");
}

const daysSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export default function CvReminderSection() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [sentEmails, setSentEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [showDraft, setShowDraft] = useState(false);

  const load = async () => {
    setLoading(true);

    // Get all artist user_ids
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "artist");
    const artistIds = (roles ?? []).map((r) => r.user_id);
    if (artistIds.length === 0) {
      setArtists([]);
      setLoading(false);
      return;
    }

    // Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, created_at")
      .in("user_id", artistIds);

    // Get artists that DO have CV entries
    const { data: cvEntries } = await supabase
      .from("cv_entries")
      .select("profile_id")
      .in("profile_id", artistIds);
    const withCv = new Set((cvEntries ?? []).map((e) => e.profile_id));

    // Filter to those without CV
    const withoutCv = (profiles ?? [])
      .filter((p) => !withCv.has(p.user_id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as Artist[];

    setArtists(withoutCv);

    // Check who already got a cv_reminder email
    const { data: logs } = await supabase
      .from("email_send_log")
      .select("recipient_email, status")
      .eq("template_name", "cv_reminder")
      .eq("status", "sent");

    // Map emails to sent status
    const emailSet = new Set<string>();
    for (const log of logs ?? []) {
      if (log.status === "sent") emailSet.add(log.recipient_email.toLowerCase());
    }
    setSentEmails(emailSet);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const waiting = useMemo(
    () => artists.filter((a) => a.email && !sentEmails.has(a.email.toLowerCase())),
    [artists, sentEmails],
  );
  const alreadySent = useMemo(
    () => artists.filter((a) => a.email && sentEmails.has(a.email.toLowerCase())),
    [artists, sentEmails],
  );

  const sendAll = async () => {
    if (waiting.length === 0) {
      toast.info("Nobody waiting for a reminder.");
      return;
    }
    if (!body.trim() || !subject.trim()) {
      toast.error("Subject and body are required.");
      return;
    }
    if (!body.includes(SIGNATURE_EMAIL)) {
      toast.error("The email body should include the signature with a reply address.");
      return;
    }

    setSending(true);
    const letters = waiting.map((a) => ({
      to: a.email!,
      toName: a.full_name || undefined,
      subject: subject.trim(),
      bodyHtml: bodyToHtml(personalise(body, a.full_name)),
      bodyText: personalise(body, a.full_name),
    }));

    try {
      const { data, error } = await supabase.functions.invoke("send-outreach-brevo", {
        body: { letters, fromName: "Jan S Kindem", campaignTag: "cv_reminder" },
      });

      if (error) {
        toast.error("Could not send reminders. Please try again.");
        setSending(false);
        return;
      }

      const result = data as { sent?: number; failures?: { to: string; error: string }[] };
      if (result.failures && result.failures.length > 0) {
        toast.warning(
          `${result.sent ?? 0} sent, ${result.failures.length} failed. Check the email log for details.`,
        );
      } else {
        toast.success(`CV reminder sent to ${result.sent ?? 0} artist${(result.sent ?? 0) === 1 ? "" : "s"}.`);
      }
      await load();
    } catch {
      toast.error("Something went wrong sending the reminders.");
    }
    setSending(false);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading CV reminders…</p>;

  return (
    <section>
      <div className="flex items-center gap-3 mb-1">
        <Mail className="h-5 w-5" />
        <h2 className="text-xl font-semibold">CV & Exhibition Reminders</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {waiting.length} artist{waiting.length === 1 ? "" : "s"} without a CV uploaded.
        Review the draft, then send to all at once. Each email is personalised with the artist's first name.
      </p>

      {artists.length === 0 ? (
        <p className="text-sm text-muted-foreground">Every artist has uploaded a CV. Nothing to send.</p>
      ) : (
        <>
          {/* Draft editor */}
          <div className="mb-4">
            <Button
              variant={showDraft ? "outline" : "default"}
              size="sm"
              onClick={() => setShowDraft(!showDraft)}
            >
              {showDraft ? "Hide draft" : "Review draft"}
            </Button>
          </div>

          {showDraft && (
            <div className="border border-border rounded-sm p-4 space-y-3 mb-4 bg-muted/30">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Body</label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={16}
                  className="font-sans text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                "Dear artist" is replaced with the recipient's first name when sent.
              </p>
            </div>
          )}

          {/* Artist list */}
          <div className="border border-border rounded-sm overflow-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium p-3">Artist</th>
                  <th className="text-left font-medium p-3 whitespace-nowrap">Joined</th>
                  <th className="text-left font-medium p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((a) => (
                  <tr key={a.user_id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <span className="font-medium block">{a.full_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">{a.email || "—"}</span>
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {daysSince(a.created_at) === 0 ? "Today" : `${daysSince(a.created_at)} d ago`}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">Waiting</Badge>
                    </td>
                  </tr>
                ))}
                {alreadySent.map((a) => (
                  <tr key={a.user_id} className="border-b border-border last:border-0 opacity-60">
                    <td className="p-3">
                      <span className="font-medium block">{a.full_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">{a.email || "—"}</span>
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {daysSince(a.created_at) === 0 ? "Today" : `${daysSince(a.created_at)} d ago`}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Reminder sent
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Send button */}
          {waiting.length > 0 && (
            <Button onClick={sendAll} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending
                ? "Sending…"
                : `Send reminder to ${waiting.length} artist${waiting.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
