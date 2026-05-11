import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Artist {
  user_id: string;
  full_name: string;
  global_artist_id: number;
}

export default function CrSubmit() {
  const { artistId } = useParams<{ artistId: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusToken, setStatusToken] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [medium, setMedium] = useState("");
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");
  const [provenance, setProvenance] = useState("");
  const [condition, setCondition] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!artistId) return;
      setLookupLoading(true);
      const { data, error } = await supabase.rpc("lookup_cr_artist" as any, { _query: artistId });
      if (error) {
        console.error(error);
      }
      const rows = (data || []) as any[];
      setArtist(rows[0] || null);
      setLookupLoading(false);
    };
    run();
  }, [artistId]);

  const submit = async () => {
    if (!artist) return;
    if (!title.trim() || !name.trim() || !email.trim()) {
      toast.error("Title, your name and email are required");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_cr_submission" as any, {
      _artist_owner_id: artist.user_id,
      _title: title.trim(),
      _year_estimated: year.trim() || null,
      _medium: medium.trim() || null,
      _height: height ? Number(height) : null,
      _width: width ? Number(width) : null,
      _depth: depth ? Number(depth) : null,
      _provenance: provenance.trim() || null,
      _condition_notes: condition.trim() || null,
      _submitter_name: name.trim(),
      _submitter_email: email.trim(),
      _owner_contact: contact.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      console.error(error);
      return;
    }
    setStatusToken((data as any) ?? null);
    setSubmitted(true);
  };

  if (lookupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-serif mb-2">Artist not found</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          We couldn't find an artist matching <span className="font-mono">{artistId}</span>. Please check the GAR
          number or link from the artist's estate.
        </p>
        <Link to="/" className="mt-6 text-sm underline">Return home</Link>
      </div>
    );
  }

  if (submitted) {
    const statusUrl = statusToken ? `${window.location.origin}/cr/status/${statusToken}` : null;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-700 dark:text-green-400 mb-4" />
        <h1 className="text-2xl font-serif mb-2">Submission received</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Thank you. The committee reviewing the catalogue raisonné of{" "}
          <span className="italic">{artist.full_name}</span> will evaluate your submission and may contact you at{" "}
          <span className="font-mono">{email}</span>.
        </p>

        {statusUrl && (
          <div className="mt-8 w-full max-w-md border border-border rounded-sm p-4 text-left">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Your status link</p>
            <p className="text-xs text-muted-foreground mb-3">
              Save this link to check your submission's progress at any time.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={statusUrl}
                className="flex-1 text-xs font-mono bg-muted/50 border border-border rounded-sm px-2 py-1.5 truncate"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(statusUrl);
                  toast.success("Link copied");
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <Link
              to={`/cr/status/${statusToken}`}
              className="inline-flex items-center gap-1.5 text-xs underline mt-3"
            >
              View status now <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        <Link to="/" className="mt-6 text-sm underline">Return home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-6">
          <ArrowLeft className="w-3 h-3" /> Home
        </Link>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Catalogue raisonné submission</p>
          <h1 className="text-3xl font-serif italic mt-1">{artist.full_name}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Submit a work you believe to be by this artist. The catalogue committee will review your submission and
            may reach out for additional information. Required fields are marked.
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-6" autoComplete="off">
          {/* Work */}
          <fieldset className="border border-border rounded-sm p-5 space-y-4">
            <legend className="text-xs uppercase tracking-wider text-muted-foreground px-2">The work</legend>

            <div>
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">Year (or estimate)</Label>
                <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} className="mt-1.5" placeholder="e.g. 1972 or c. 1970s" />
              </div>
              <div>
                <Label htmlFor="medium">Medium</Label>
                <Input id="medium" value={medium} onChange={(e) => setMedium(e.target.value)} className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Dimensions (cm)</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="H" type="number" />
                <Input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="W" type="number" />
                <Input value={depth} onChange={(e) => setDepth(e.target.value)} placeholder="D (opt)" type="number" />
              </div>
            </div>

            <div>
              <Label htmlFor="prov">Provenance</Label>
              <Textarea id="prov" value={provenance} onChange={(e) => setProvenance(e.target.value)} className="mt-1.5 min-h-[80px]" placeholder="Ownership history, exhibitions, publications…" />
            </div>

            <div>
              <Label htmlFor="cond">Condition notes</Label>
              <Textarea id="cond" value={condition} onChange={(e) => setCondition(e.target.value)} className="mt-1.5 min-h-[60px]" />
            </div>
          </fieldset>

          {/* Submitter */}
          <fieldset className="border border-border rounded-sm p-5 space-y-4">
            <legend className="text-xs uppercase tracking-wider text-muted-foreground px-2">Your details</legend>

            <div>
              <Label htmlFor="name">Your name <span className="text-destructive">*</span></Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" required />
            </div>

            <div>
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" required />
            </div>

            <div>
              <Label htmlFor="contact">Owner contact (if not you)</Label>
              <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1.5" />
            </div>
          </fieldset>

          <p className="text-xs text-muted-foreground">
            Images and supporting documents can be sent separately once the committee responds. Submissions become
            part of the archival record.
          </p>

          <Button type="submit" disabled={submitting} className="w-full h-11">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit for review"}
          </Button>
        </form>
      </div>
    </div>
  );
}
