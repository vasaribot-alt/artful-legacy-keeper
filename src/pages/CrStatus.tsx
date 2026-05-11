import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Check, Circle, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Submission {
  id: string;
  title: string;
  status: string;
  created_at: string;
  decision_at: string | null;
  rejection_reason: string | null;
  cr_number: number | null;
  artist_name: string | null;
  artist_id: string;
}

interface TimelineEvent {
  action: string;
  created_at: string;
  payload: any;
}

const STAGES = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under review" },
  { key: "decision", label: "Decision" },
] as const;

function stageIndex(status: string): number {
  if (status === "submitted") return 0;
  if (status === "under_review" || status === "deferred") return 1;
  if (status === "accepted" || status === "rejected") return 2;
  return 0;
}

export default function CrStatus() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      const [{ data: s }, { data: t }] = await Promise.all([
        supabase.rpc("get_cr_submission_status" as any, { _token: token }),
        supabase.rpc("get_cr_submission_timeline" as any, { _token: token }),
      ]);
      const row = (s as any[])?.[0] || null;
      setSubmission(row);
      setTimeline((t as any[]) || []);
      setLoading(false);
    };
    run();
  }, [token]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-serif mb-2">Submission not found</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          This status link is invalid or has expired. Please check the URL.
        </p>
        <Link to="/" className="mt-6 text-sm underline">Return home</Link>
      </div>
    );
  }

  const currentStage = stageIndex(submission.status);
  const isRejected = submission.status === "rejected";
  const isAccepted = submission.status === "accepted";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-6">
          <ArrowLeft className="w-3 h-3" /> Home
        </Link>

        <div className="mb-10">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Submission status</p>
          <h1 className="text-3xl font-serif italic mt-1">{submission.title}</h1>
          {submission.artist_name && (
            <p className="text-sm text-muted-foreground mt-1">
              Catalogue raisonné of {submission.artist_name}
            </p>
          )}
          <Button variant="ghost" size="sm" onClick={copyLink} className="mt-3 -ml-2 h-7 text-xs gap-1.5">
            <Copy className="w-3 h-3" /> Copy status link
          </Button>
        </div>

        {/* Stage progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-0 right-0 h-px bg-border -z-0" />
            {STAGES.map((stage, i) => {
              const active = i <= currentStage;
              const isFinal = i === 2;
              const showReject = isFinal && isRejected;
              return (
                <div key={stage.key} className="flex flex-col items-center gap-2 relative z-10 bg-background px-3">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                      showReject
                        ? "bg-destructive border-destructive text-destructive-foreground"
                        : active
                        ? "bg-foreground border-foreground text-background"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    {showReject ? (
                      <X className="w-4 h-4" />
                    ) : active ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Circle className="w-3 h-3" />
                    )}
                  </div>
                  <span className={`text-xs ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    {isFinal && isAccepted ? "Accepted" : isFinal && isRejected ? "Rejected" : stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outcome details */}
        {isAccepted && (
          <div className="border border-border rounded-sm p-5 mb-8 bg-muted/30">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Accepted into the catalogue</p>
            {submission.cr_number != null && (
              <p className="text-sm">
                Catalogue number: <span className="font-mono">CR {submission.cr_number}</span>
              </p>
            )}
          </div>
        )}

        {isRejected && submission.rejection_reason && (
          <div className="border border-border rounded-sm p-5 mb-8 bg-muted/30">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Decision</p>
            <p className="text-sm">{submission.rejection_reason}</p>
          </div>
        )}

        {/* Timeline */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Timeline</p>
          <ol className="space-y-3">
            {timeline.map((ev, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-muted-foreground font-mono text-xs whitespace-nowrap pt-0.5 w-32 shrink-0">
                  {new Date(ev.created_at).toLocaleDateString(undefined, {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </span>
                <span>
                  {ev.action === "submitted" && "Submission received"}
                  {ev.action === "status_changed" &&
                    `Status: ${ev.payload?.from || "—"} → ${ev.payload?.to || "—"}`}
                  {ev.action === "decision_finalized" &&
                    `Decision finalized — ${ev.payload?.outcome}${
                      ev.payload?.reason ? ` (${ev.payload.reason})` : ""
                    }`}
                  {ev.action === "reopened" && "Submission reopened for review"}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-muted-foreground mt-10">
          Bookmark this page or save the link to check back on your submission. The catalogue committee may contact
          you by email if more information is needed.
        </p>
      </div>
    </div>
  );
}
