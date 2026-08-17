import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, Check, X, Paperclip } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  status: string;
  reasoning: string | null;
  correspondence_messages: {
    id: string;
    subject: string | null;
    sent_at: string | null;
    from_name: string | null;
    from_email: string | null;
    has_attachments: boolean;
  } | null;
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Undated";

/** Correspondence linked to one artwork or exhibition. */
export function CorrespondencePanel({ artworkId, exhibitionId }: { artworkId?: string; exhibitionId?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let q = supabase
      .from("correspondence_links")
      .select("id, status, reasoning, correspondence_messages(id, subject, sent_at, from_name, from_email, has_attachments)")
      .neq("status", "rejected");
    if (artworkId) q = q.eq("artwork_id", artworkId);
    else if (exhibitionId) q = q.eq("exhibition_id", exhibitionId);
    else return;
    const { data } = await q;
    const list = ((data ?? []) as unknown as Row[]).filter((r) => r.correspondence_messages);
    list.sort((a, b) => (b.correspondence_messages?.sent_at ?? "").localeCompare(a.correspondence_messages?.sent_at ?? ""));
    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworkId, exhibitionId]);

  const setStatus = async (id: string, status: "confirmed" | "rejected") => {
    const { error } = await supabase.from("correspondence_links").update({ status }).eq("id", id);
    if (error) { toast.error("Could not update", { description: error.message }); return; }
    load();
  };

  if (loading || rows.length === 0) return null;

  return (
    <section className="border border-border rounded-sm p-4 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Correspondence</h3>
        <span className="text-xs text-muted-foreground ml-auto">{rows.length}</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => {
          const m = r.correspondence_messages!;
          return (
            <div key={r.id} className="py-2 flex items-start gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate">{m.subject || "(no subject)"}</span>
                  {m.has_attachments && <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {fmt(m.sent_at)} · {m.from_name || m.from_email}
                  {r.status === "suggested" && r.reasoning && <> · {r.reasoning}</>}
                </div>
              </div>
              {r.status === "suggested" ? (
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStatus(r.id, "confirmed")} aria-label="Confirm">
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStatus(r.id, "rejected")} aria-label="Reject">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <Link to="/correspondence" className="text-xs underline text-muted-foreground mt-3 inline-block">
        Open correspondence archive
      </Link>
    </section>
  );
}
