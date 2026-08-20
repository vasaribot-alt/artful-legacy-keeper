import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Lock, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export interface ProfileDraft {
  biography?: string | null;
  chronology?: string | null;
  city?: string | null;
  country?: string | null;
  birth_year?: number | null;
  website?: string | null;
  galleries?: string[];
  social_links?: Record<string, string>;
  sources?: string[];
  confidence?: "high" | "medium" | "low";
}

interface Props {
  idVerified: boolean;
  onApply: (draft: ProfileDraft, keys: (keyof ProfileDraft)[]) => void;
  onVerifyClick?: () => void;
}

const FIELD_LABELS: { key: keyof ProfileDraft; label: string }[] = [
  { key: "biography", label: "Biography" },
  { key: "chronology", label: "Chronology" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "birth_year", label: "Year of birth" },
  { key: "website", label: "Website" },
  { key: "galleries", label: "Galleries" },
  { key: "social_links", label: "Social media links" },
];

const previewValue = (key: keyof ProfileDraft, draft: ProfileDraft): string | null => {
  const v = draft[key];
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.length ? v.join(", ") : null;
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, string>);
    return entries.length ? entries.map(([k, url]) => `${k}: ${url}`).join("\n") : null;
  }
  return String(v);
};

export function AiProfileAssist({ idVerified, onApply, onVerifyClick }: Props) {
  const [hints, setHints] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  if (!idVerified) {
    return (
      <section className="space-y-3 scroll-mt-6" id="ai-assist">
        <h2 className="text-2xl">AI profile assistance</h2>
        <div className="flex items-start gap-3 p-4 border border-border rounded-sm bg-secondary/40">
          <Lock className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Available after ID verification</p>
            <p className="text-xs text-muted-foreground max-w-xl">
              Once your identity is verified, we can draft your biography, chronology and
              representation from publicly available sources. You review every suggestion before
              anything is saved — nothing is published automatically.
            </p>
            {onVerifyClick && (
              <Button variant="outline" size="sm" className="mt-2" onClick={onVerifyClick}>
                Verify my identity
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const run = async () => {
    setLoading(true);
    setDraft(null);
    setApplied(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("draft-my-profile", {
        body: { hints: hints.trim() || undefined },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setDraft(data.draft as ProfileDraft);
      if (data?.draft?.confidence === "low") {
        toast.warning("Low confidence — add a website or gallery hint and try again.");
      }
    } catch {
      toast.error("Could not generate a draft");
    } finally {
      setLoading(false);
    }
  };

  const applyField = (key: keyof ProfileDraft) => {
    if (!draft) return;
    onApply(draft, [key]);
    setApplied((prev) => new Set(prev).add(key as string));
  };

  const applyAll = () => {
    if (!draft) return;
    const keys = FIELD_LABELS.map((f) => f.key).filter((k) => previewValue(k, draft) !== null);
    onApply(draft, keys);
    setApplied(new Set(keys as string[]));
  };

  const filled = draft ? FIELD_LABELS.filter((f) => previewValue(f.key, draft) !== null) : [];

  return (
    <section className="space-y-4 scroll-mt-6" id="ai-assist">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl">AI profile assistance</h2>
        <Button variant="outline" size="sm" onClick={run} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Researching…" : draft ? "Run again" : "Draft from public sources"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground max-w-2xl">
        We research publicly available information about you and propose draft content. Every field is
        a suggestion — review, edit and save what is correct. Nothing is saved until you press Save.
      </p>
      <div>
        <Label className="text-xs text-muted-foreground">Optional hint (website, gallery, or where you work)</Label>
        <Input
          value={hints}
          onChange={(e) => setHints(e.target.value)}
          placeholder="e.g. represented by Galleri K, Oslo"
          className="mt-1"
          autoComplete="off"
        />
      </div>

      {draft && (
        <div className="space-y-3 border border-border rounded-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Suggestions {draft.confidence ? `· confidence: ${draft.confidence}` : ""}
            </p>
            {filled.length > 0 && (
              <Button variant="ghost" size="sm" onClick={applyAll}>Apply all</Button>
            )}
          </div>
          {filled.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No confident public information found. Try adding a hint above.
            </p>
          )}
          {filled.map(({ key, label }, i) => (
            <div key={key as string} className="space-y-2">
              {i > 0 && <Separator />}
              <div className="flex items-start justify-between gap-4 pt-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
                    {previewValue(key, draft)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => applyField(key)}
                  disabled={applied.has(key as string)}
                >
                  {applied.has(key as string) ? <><Check className="w-3.5 h-3.5" /> Added</> : "Use"}
                </Button>
              </div>
            </div>
          ))}
          {draft.sources && draft.sources.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Sources</p>
                {draft.sources.slice(0, 8).map((s) => (
                  <a key={s} href={s} target="_blank" rel="noreferrer" className="block text-xs text-muted-foreground underline break-all">
                    {s}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
