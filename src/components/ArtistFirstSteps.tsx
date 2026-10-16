import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface Props {
  userId: string;
  artworkCount: number;
  onAddArtwork: () => void;
}

/** Guided first steps for artists whose archive is still (nearly) empty. */
export function ArtistFirstSteps({ userId, artworkCount, onAddArtwork }: Props) {
  const navigate = useNavigate();
  const dismissKey = `firstStepsDismissed:${userId}`;
  const [hidden, setHidden] = useState(() => localStorage.getItem(dismissKey) === "1");
  const [state, setState] = useState<{ profile: boolean; cv: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, biography, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();
      const profile = !!((p as any)?.biography?.trim() || (p as any)?.avatar_url);
      let cv = false;
      if (p?.id) {
        const { count } = await supabase.from("cv_entries").select("id", { count: "exact", head: true }).eq("profile_id", p.id);
        cv = (count || 0) > 0;
      }
      if (!cv) {
        const { count } = await supabase.from("exhibitions").select("id", { count: "exact", head: true }).eq("user_id", userId);
        cv = (count || 0) > 0;
      }
      setState({ profile, cv });
    })();
  }, [userId]);

  if (hidden || !state) return null;
  const works = artworkCount > 0;
  const done = [works, state.profile, state.cv].filter(Boolean).length;
  if (done === 3) return null;

  const steps = [
    {
      done: works,
      title: "Add your first work",
      text: "A title, a year and a photo from your phone is enough to start. You can add details later.",
      action: "Add a work",
      onClick: onAddArtwork,
    },
    {
      done: state.profile,
      title: "Introduce yourself",
      text: "Add a portrait and a few lines about your practice.",
      action: "Open profile",
      onClick: () => navigate("/profile"),
    },
    {
      done: state.cv,
      title: "Bring in your CV",
      text: "Paste your existing CV, or give us your website address, and we turn it into records you approve one by one.",
      action: "Add CV",
      onClick: () => navigate("/cv"),
    },
  ];

  return (
    <section className="mb-6 border border-border rounded-sm p-5 bg-secondary/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Your first steps</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {done} of 3 done · Everything you add stays yours. Need help? Reply to any email from us, or write to outreach@globalartistregistry.org.
          </p>
        </div>
        <button
          aria-label="Hide first steps"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => { localStorage.setItem(dismissKey, "1"); setHidden(true); }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="border border-border rounded-sm p-4 bg-background flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full border border-border flex items-center justify-center text-xs ${s.done ? "bg-foreground text-background" : ""}`}>
                {s.done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <p className="text-sm font-medium">{s.title}</p>
            </div>
            <p className="text-sm text-muted-foreground flex-1">{s.text}</p>
            {!s.done && (
              <Button variant="outline" size="sm" className="self-start" onClick={s.onClick}>{s.action}</Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
