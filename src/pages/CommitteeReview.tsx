import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RegistrarWorkspaceLayout } from "@/components/RegistrarWorkspaceLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Check, X, Pause, MinusCircle, Plus, Loader2, ScrollText, ImagePlus, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";

type Status = "submitted" | "under_review" | "accepted" | "rejected" | "deferred";
type Vote = "accept" | "reject" | "defer" | "abstain";

interface Submission {
  id: string;
  artist_owner_id: string;
  title: string;
  year_estimated: string | null;
  medium: string | null;
  status: Status;
  submitter_name: string | null;
  submitter_email: string | null;
  created_at: string;
  rejection_reason: string | null;
  rejection_notes: string | null;
  decision_at: string | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  provenance: string | null;
  condition_notes: string | null;
  owner_contact: string | null;
  cr_number: number | null;
  resulting_artwork_id: string | null;
}

interface SubmissionImage {
  id: string;
  submission_id: string;
  storage_path: string;
  display_order: number;
  caption: string | null;
}

interface VoteRow {
  id: string;
  submission_id: string;
  voter_id: string;
  vote: Vote;
  note: string | null;
  updated_at: string;
}

interface AuditEntry {
  id: string;
  actor_id: string | null;
  action: string;
  payload: any;
  created_at: string;
}

const STATUS_LABEL: Record<Status, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  accepted: "Accepted",
  rejected: "Rejected",
  deferred: "Deferred",
};

const REJECTION_REASONS = [
  "Not by the artist",
  "Insufficient provenance",
  "Condition / integrity",
  "Duplicate of catalogued work",
  "Other",
];

function StatusBadge({ status }: { status: Status }) {
  const variants: Record<Status, string> = {
    submitted: "bg-muted text-foreground",
    under_review: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
    accepted: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
    rejected: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
    deferred: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  };
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm ${variants[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ───────────────────── INBOX ─────────────────────
export function CommitteeInbox() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<Vote, number>>>({});
  const [myVotes, setMyVotes] = useState<Record<string, Vote>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "under_review" | "decided" | "rejected" | "deferred">("all");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const fetchAll = async () => {
    if (!ownerId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: subs } = await supabase
      .from("cr_submissions" as any)
      .select("*")
      .eq("artist_owner_id", ownerId)
      .order("created_at", { ascending: false });

    const list = (subs || []) as unknown as Submission[];
    setSubmissions(list);

    if (list.length > 0) {
      const ids = list.map((s) => s.id);
      const { data: votes } = await supabase
        .from("cr_committee_votes" as any)
        .select("submission_id, voter_id, vote")
        .in("submission_id", ids);

      const counts: Record<string, Record<Vote, number>> = {};
      const mine: Record<string, Vote> = {};
      ((votes || []) as any[]).forEach((v) => {
        counts[v.submission_id] ||= { accept: 0, reject: 0, defer: 0, abstain: 0 };
        counts[v.submission_id][v.vote as Vote] += 1;
        if (user && v.voter_id === user.id) mine[v.submission_id] = v.vote as Vote;
      });
      setVoteCounts(counts);
      setMyVotes(mine);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [ownerId]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (filter === "all") return true;
      if (filter === "pending") return !myVotes[s.id] && (s.status === "submitted" || s.status === "under_review");
      if (filter === "under_review") return s.status === "under_review" || s.status === "submitted";
      if (filter === "decided") return s.status === "accepted" || s.status === "rejected";
      if (filter === "rejected") return s.status === "rejected";
      if (filter === "deferred") return s.status === "deferred";
      return true;
    });
  }, [submissions, filter, myVotes]);

  const handleCreate = async () => {
    if (!ownerId || !newTitle.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("cr_submissions" as any)
      .insert({ artist_owner_id: ownerId, title: newTitle.trim(), status: "submitted" } as any)
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) {
      toast.error("Could not create submission");
      return;
    }
    setNewTitle("");
    toast.success("Submission created");
    navigate(`/registrar/client/${ownerId}/committee/${(data as any).id}`);
  };

  return (
    <RegistrarWorkspaceLayout>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif">Committee review</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Submissions awaiting committee decision for this estate.
            </p>
          </div>
        </div>

        {/* Quick create */}
        <div className="rounded-sm border border-border bg-card p-4 flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="newTitle" className="text-xs uppercase tracking-wider text-muted-foreground">
              New submission
            </Label>
            <Input
              id="newTitle"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Working title…"
              className="mt-1.5 h-10"
              autoComplete="off"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <Button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="h-10 gap-1.5">
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create
          </Button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "pending", "under_review", "decided", "rejected", "deferred"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-sm border transition-colors ${
                filter === f
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "pending" ? "Pending my vote" :
               f === "under_review" ? "Open" :
               f === "decided" ? "Decided" :
               f === "all" ? "All" : STATUS_LABEL[f as Status]}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-secondary animate-pulse rounded-sm" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">
            No submissions match this filter.
          </div>
        ) : (
          <div className="border border-border rounded-sm divide-y divide-border">
            {filtered.map((s) => {
              const counts = voteCounts[s.id] || { accept: 0, reject: 0, defer: 0, abstain: 0 };
              const myVote = myVotes[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/registrar/client/${ownerId}/committee/${s.id}`)}
                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium italic truncate">{s.title}</h3>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted {new Date(s.created_at).toLocaleDateString()}
                      {s.submitter_name ? ` · ${s.submitter_name}` : ""}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                    <span className="text-green-700 dark:text-green-400">{counts.accept} accept</span>
                    <span className="mx-1.5">·</span>
                    <span className="text-amber-700 dark:text-amber-400">{counts.defer} defer</span>
                    <span className="mx-1.5">·</span>
                    <span className="text-red-700 dark:text-red-400">{counts.reject} reject</span>
                  </div>
                  {myVote && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider capitalize">
                      You: {myVote}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </RegistrarWorkspaceLayout>
  );
}

// ───────────────────── DETAIL ─────────────────────
export function CommitteeSubmissionDetail() {
  const { ownerId, submissionId } = useParams<{ ownerId: string; submissionId: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [voterNames, setVoterNames] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [quorum, setQuorum] = useState(2);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [myNote, setMyNote] = useState("");

  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [showAudit, setShowAudit] = useState(true);
  const [images, setImages] = useState<SubmissionImage[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const [uploading, setUploading] = useState(false);

  const fetchAll = async () => {
    if (!submissionId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: sub } = await supabase
      .from("cr_submissions" as any)
      .select("*")
      .eq("id", submissionId)
      .single();
    const s = sub as unknown as Submission | null;
    setSubmission(s);
    if (s) {
      setRejectionReason(s.rejection_reason || "");
      setRejectionNotes(s.rejection_notes || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("committee_quorum")
        .eq("user_id", s.artist_owner_id)
        .maybeSingle();
      if (profile?.committee_quorum) setQuorum(profile.committee_quorum);
    }

    const { data: voteRows } = await supabase
      .from("cr_committee_votes" as any)
      .select("*")
      .eq("submission_id", submissionId)
      .order("updated_at", { ascending: false });
    const vs = (voteRows || []) as unknown as VoteRow[];
    setVotes(vs);

    if (user) {
      const mine = vs.find((v) => v.voter_id === user.id);
      if (mine) {
        setMyVote(mine.vote);
        setMyNote(mine.note || "");
      }
    }

    if (vs.length > 0) {
      const voterIds = Array.from(new Set(vs.map((v) => v.voter_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", voterIds);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name || "Committee member"; });
      setVoterNames(map);
    }

    const { data: log } = await supabase
      .from("cr_audit_log" as any)
      .select("*")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false });
    setAudit((log || []) as unknown as AuditEntry[]);

    const { data: imgs } = await supabase
      .from("cr_submission_images" as any)
      .select("*")
      .eq("submission_id", submissionId)
      .order("display_order", { ascending: true });
    const imageRows = (imgs || []) as unknown as SubmissionImage[];
    setImages(imageRows);

    // Private bucket: resolve short-lived signed URLs for authorized viewers
    if (imageRows.length > 0) {
      const { data: signed } = await supabase.storage
        .from(CR_IMAGE_BUCKET)
        .createSignedUrls(imageRows.map((i) => i.storage_path), 3600);
      const map: Record<string, string> = {};
      (signed || []).forEach((s: any, idx: number) => {
        if (s?.signedUrl) map[imageRows[idx].storage_path] = s.signedUrl;
      });
      setImageUrls(map);
    } else {
      setImageUrls({});
    }


    setLoading(false);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !submission || !submissionId) return;
    setUploading(true);
    let nextOrder = images.length;
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${submission.artist_owner_id}/${submissionId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(CR_IMAGE_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) {
        console.error(upErr);
        toast.error(`Could not upload ${file.name}`);
        continue;
      }
      const { error: dbErr } = await supabase.from("cr_submission_images" as any).insert({
        submission_id: submissionId,
        storage_path: path,
        display_order: nextOrder++,
      } as any);
      if (dbErr) {
        console.error(dbErr);
        await supabase.storage.from(CR_IMAGE_BUCKET).remove([path]);
        toast.error(`Could not record ${file.name}`);
      }
    }
    setUploading(false);
    fetchAll();
  };

  const handleDeleteImage = async (img: SubmissionImage) => {
    if (!confirm("Remove this image?")) return;
    await supabase.storage.from(CR_IMAGE_BUCKET).remove([img.storage_path]);
    await supabase.from("cr_submission_images" as any).delete().eq("id", img.id);
    fetchAll();
  };


  useEffect(() => {
    fetchAll();
  }, [submissionId]);

  const tally = useMemo(() => {
    const t: Record<Vote, number> = { accept: 0, reject: 0, defer: 0, abstain: 0 };
    votes.forEach((v) => { t[v.vote] += 1; });
    return t;
  }, [votes]);

  const totalCast = tally.accept + tally.reject + tally.defer + tally.abstain;
  const quorumMet = totalCast >= quorum;
  const winner: Vote | "tie" | null = quorumMet
    ? (() => {
        const decisive = { accept: tally.accept, reject: tally.reject, defer: tally.defer };
        const max = Math.max(decisive.accept, decisive.reject, decisive.defer);
        const winners = (Object.keys(decisive) as Vote[]).filter((k) => decisive[k] === max);
        if (winners.length === 1 && max > 0) return winners[0];
        return "tie";
      })()
    : null;

  const submitVote = async (vote: Vote) => {
    if (!submissionId || !userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("cr_committee_votes" as any)
      .upsert(
        { submission_id: submissionId, voter_id: userId, vote, note: myNote.trim() || null } as any,
        { onConflict: "submission_id,voter_id" }
      );
    setSaving(false);
    if (error) {
      toast.error("Could not record vote");
      return;
    }
    setMyVote(vote);
    toast.success("Vote recorded");
    // Move submission to under_review on first vote
    if (submission && submission.status === "submitted") {
      await supabase.from("cr_submissions" as any).update({ status: "under_review" } as any).eq("id", submissionId);
    }
    fetchAll();
  };

  const finalize = async (outcome: "accepted" | "rejected" | "deferred") => {
    if (!submission || !submissionId) return;
    if (outcome === "rejected" && !rejectionReason) {
      toast.error("Pick a rejection reason");
      return;
    }
    setSaving(true);
    const update: any = {
      status: outcome,
      decision_at: new Date().toISOString(),
      decision_by: userId,
    };
    if (outcome === "rejected") {
      update.rejection_reason = rejectionReason;
      update.rejection_notes = rejectionNotes.trim() || null;
    } else {
      update.rejection_reason = null;
      update.rejection_notes = null;
    }

    // Create artwork on accept + assign CR number
    if (outcome === "accepted") {
      // Next CR number for this estate
      const { data: maxRow } = await supabase
        .from("artworks")
        .select("cr_number")
        .eq("owner_id", submission.artist_owner_id)
        .not("cr_number", "is", null)
        .order("cr_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextCr = ((maxRow as any)?.cr_number || 0) + 1;

      const { data: artwork, error: artErr } = await supabase
        .from("artworks")
        .insert({
          owner_id: submission.artist_owner_id,
          title: submission.title,
          year: submission.year_estimated ? parseInt(submission.year_estimated) || null : null,
          medium: submission.medium,
          height: submission.height,
          width: submission.width,
          depth: submission.depth,
          provenance: submission.provenance,
          status: "available",
          role_context: "artist",
          cr_number: nextCr,
          catalogue_number: `CR ${nextCr}`,
        } as any)
        .select("id")
        .single();
      if (artErr || !artwork) {
        setSaving(false);
        toast.error("Could not create artwork");
        return;
      }
      update.resulting_artwork_id = artwork.id;
      update.cr_number = nextCr;

      // Copy submission images into artwork_images (re-use same storage paths)
      if (images.length > 0) {
        const rows = images.map((img, idx) => ({
          artwork_id: artwork.id,
          storage_path: img.storage_path,
          display_order: idx,
        }));
        await supabase.from("artwork_images").insert(rows as any);
      }
    }

    const { error } = await supabase.from("cr_submissions" as any).update(update).eq("id", submissionId);
    setSaving(false);
    if (error) {
      toast.error("Could not finalize");
      return;
    }
    toast.success(outcome === "accepted" ? "Accepted into catalogue" : outcome === "rejected" ? "Recorded as rejected" : "Marked deferred");
    fetchAll();
  };

  const reopen = async () => {
    if (!submissionId) return;
    setSaving(true);
    await supabase
      .from("cr_submissions" as any)
      .update({ status: "under_review", decision_at: null, decision_by: null } as any)
      .eq("id", submissionId);
    setSaving(false);
    fetchAll();
  };

  if (loading) {
    return (
      <RegistrarWorkspaceLayout>
        <div className="max-w-6xl mx-auto px-6 py-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </RegistrarWorkspaceLayout>
    );
  }

  if (!submission) {
    return (
      <RegistrarWorkspaceLayout>
        <div className="max-w-6xl mx-auto px-6 py-12 text-center text-sm text-muted-foreground">
          Submission not found.
        </div>
      </RegistrarWorkspaceLayout>
    );
  }

  const decided = submission.status === "accepted" || submission.status === "rejected";

  return (
    <RegistrarWorkspaceLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate(`/registrar/client/${ownerId}/committee`)}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-4"
        >
          <ArrowLeft className="w-3 h-3" /> Back to committee inbox
        </button>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-serif italic">{submission.title}</h2>
              <StatusBadge status={submission.status} />
              {submission.cr_number && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm bg-foreground text-background font-medium">
                  CR {submission.cr_number}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted {new Date(submission.created_at).toLocaleDateString()}
              {submission.submitter_name ? ` by ${submission.submitter_name}` : ""}
              {submission.submitter_email ? ` · ${submission.submitter_email}` : ""}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 shrink-0"
            onClick={() => {
              const url = `${window.location.origin}/cr/submit/${submission.artist_owner_id}`;
              navigator.clipboard.writeText(url);
              toast.success("Public submission link copied");
            }}
          >
            <Share2 className="w-3.5 h-3.5" /> Public link
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* LEFT — metadata */}
          <div className="space-y-6">
            <section className="border border-border rounded-sm p-5 space-y-4">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Work details</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Year</dt><dd>{submission.year_estimated || "—"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Medium</dt><dd>{submission.medium || "—"}</dd></div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Dimensions (cm)</dt>
                  <dd>
                    {[submission.height, submission.width, submission.depth].some(Boolean)
                      ? `${submission.height ?? "?"} × ${submission.width ?? "?"}${submission.depth ? ` × ${submission.depth}` : ""}`
                      : "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Provenance</dt>
                  <dd className="whitespace-pre-line">{submission.provenance || "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Condition</dt>
                  <dd className="whitespace-pre-line">{submission.condition_notes || "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Owner contact</dt>
                  <dd>{submission.owner_contact || "—"}</dd>
                </div>
              </dl>
            </section>

            {/* Images */}
            <section className="border border-border rounded-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Images ({images.length})</h3>
                {!decided && (
                  <label className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm cursor-pointer hover:bg-accent">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                    Add images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => { handleUpload(e.target.files); e.target.value = ""; }}
                    />
                  </label>
                )}
              </div>
              {images.length === 0 ? (
                <p className="text-sm text-muted-foreground">No images attached yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {images.map((img) => {
                    const url = supabase.storage.from("artwork-images").getPublicUrl(img.storage_path).data.publicUrl;
                    return (
                      <div key={img.id} className="relative aspect-square rounded-sm overflow-hidden bg-secondary group">
                        <img src={url} alt="Submission" className="w-full h-full object-cover" />
                        {!decided && (
                          <button
                            onClick={() => handleDeleteImage(img)}
                            className="absolute top-1.5 right-1.5 p-1 bg-background/90 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
                On acceptance, these images are linked to the resulting catalogue artwork.
              </p>
            </section>
            <section className="border border-border rounded-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Committee votes</h3>
                <span className="text-xs text-muted-foreground">
                  {totalCast} cast · quorum {quorum} {quorumMet ? "✓" : ""}
                </span>
              </div>
              {votes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No votes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {votes.map((v) => (
                    <li key={v.id} className="text-sm flex items-start gap-3">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-medium ${
                        v.vote === "accept" ? "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200" :
                        v.vote === "reject" ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" :
                        v.vote === "defer" ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" :
                        "bg-muted text-muted-foreground"
                      }`}>{v.vote}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{voterNames[v.voter_id] || "Committee member"}</p>
                        {v.note && <p className="text-xs text-muted-foreground whitespace-pre-line mt-0.5">{v.note}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(v.updated_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Audit log */}
            <section className="border border-border rounded-sm">
              <button
                onClick={() => setShowAudit((s) => !s)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Audit log</h3>
                  <span className="text-xs text-muted-foreground">({audit.length})</span>
                </div>
                <span className="text-xs text-muted-foreground">{showAudit ? "Hide" : "Show"}</span>
              </button>
              {showAudit && (
                <ul className="px-5 pb-5 space-y-2 border-t border-border pt-4">
                  {audit.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events yet.</p>
                  ) : audit.map((e) => (
                    <li key={e.id} className="text-xs flex items-start gap-3 font-mono">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString()}
                      </span>
                      <span className="font-semibold">{e.action}</span>
                      {e.payload && (
                        <span className="text-muted-foreground truncate">
                          {Object.entries(e.payload)
                            .filter(([, v]) => v !== null && v !== undefined && v !== "")
                            .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
                            .join(" · ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* RIGHT — vote + decision panel */}
          <aside className="space-y-6">
            {/* My vote */}
            <section className="border border-border rounded-sm p-5 space-y-3 bg-card">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Your vote</h3>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: "accept", icon: Check, label: "Accept" },
                  { v: "reject", icon: X, label: "Reject" },
                  { v: "defer", icon: Pause, label: "Defer" },
                  { v: "abstain", icon: MinusCircle, label: "Abstain" },
                ] as const).map(({ v, icon: Icon, label }) => (
                  <Button
                    key={v}
                    variant={myVote === v ? "default" : "outline"}
                    size="sm"
                    disabled={saving || decided}
                    onClick={() => submitVote(v)}
                    className="h-9 gap-1.5 justify-center"
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </Button>
                ))}
              </div>
              <div>
                <Label htmlFor="myNote" className="text-xs text-muted-foreground">Note (optional)</Label>
                <Textarea
                  id="myNote"
                  value={myNote}
                  onChange={(e) => setMyNote(e.target.value)}
                  placeholder="Reasoning, attribution evidence, doubts…"
                  className="mt-1.5 text-sm min-h-[80px]"
                  disabled={decided}
                />
              </div>
              {myVote && !decided && (
                <Button variant="outline" size="sm" onClick={() => submitVote(myVote)} disabled={saving} className="w-full h-9">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Update note"}
                </Button>
              )}
            </section>

            {/* Decision */}
            <section className="border border-border rounded-sm p-5 space-y-3 bg-card">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Decision</h3>
              {decided ? (
                <>
                  <p className="text-sm">
                    Finalized as <span className="font-semibold capitalize">{submission.status}</span> on{" "}
                    {submission.decision_at && new Date(submission.decision_at).toLocaleDateString()}.
                  </p>
                  {submission.rejection_reason && (
                    <div className="text-xs text-muted-foreground">
                      <div><span className="font-semibold text-foreground">Reason:</span> {submission.rejection_reason}</div>
                      {submission.rejection_notes && (
                        <div className="mt-1 whitespace-pre-line">{submission.rejection_notes}</div>
                      )}
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={reopen} disabled={saving} className="w-full h-9">
                    Reopen for review
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground">
                    {!quorumMet
                      ? `Need ${quorum - totalCast} more vote${quorum - totalCast === 1 ? "" : "s"} to reach quorum.`
                      : winner === "tie"
                        ? "Quorum met but no clear majority — recommend deferring."
                        : `Quorum met. Current majority: ${winner}.`}
                  </div>

                  <Button
                    className="w-full h-9 gap-1.5"
                    disabled={saving || !quorumMet}
                    onClick={() => finalize("accepted")}
                  >
                    <Check className="w-3.5 h-3.5" /> Finalize as Accepted
                  </Button>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label className="text-xs">Rejection reason</Label>
                    <Select value={rejectionReason} onValueChange={setRejectionReason}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select reason…" />
                      </SelectTrigger>
                      <SelectContent>
                        {REJECTION_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder="Additional notes…"
                      className="text-sm min-h-[60px]"
                    />
                    <Button
                      variant="destructive"
                      className="w-full h-9 gap-1.5"
                      disabled={saving || !quorumMet || !rejectionReason}
                      onClick={() => finalize("rejected")}
                    >
                      <X className="w-3.5 h-3.5" /> Finalize as Rejected
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-9 gap-1.5"
                    disabled={saving}
                    onClick={() => finalize("deferred")}
                  >
                    <Pause className="w-3.5 h-3.5" /> Defer
                  </Button>
                </>
              )}
            </section>
          </aside>
        </div>
      </div>
    </RegistrarWorkspaceLayout>
  );
}
