import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Linkedin, X } from "lucide-react";

interface LinkedInPost {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
}

// The LinkedIn series runs on a weekly cadence, Wednesdays.
function nextWednesday(after: Date): Date {
  const d = new Date(after);
  d.setHours(0, 0, 0, 0);
  const diff = (3 - d.getDay() + 7) % 7 || 7; // 3 = Wednesday; 0 means "this Wednesday" -> next week
  d.setDate(d.getDate() + diff);
  return d;
}

const DISMISS_KEY = "linkedin-reminder-dismissed";

const LinkedInReminderBanner = () => {
  const navigate = useNavigate();
  const [due, setDue] = useState<{ label: string; dueDate: Date } | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === new Date().toDateString(),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!roles?.some((r) => r.role === "foundation")) return;
      const { data: posts } = await supabase
        .from("linkedin_posts")
        .select("id, title, status, published_at");
      if (cancelled || !posts?.length) return;

      // Next pending post, in series order ("1 —", "2 —", …)
      const pending = posts
        .filter((p) => p.status !== "published")
        .sort((a, b) => {
          const na = parseInt(a.title, 10) || 999;
          const nb = parseInt(b.title, 10) || 999;
          return na - nb;
        })[0];
      if (!pending) return;

      const publishedDates = posts
        .filter((p) => p.status === "published" && p.published_at)
        .map((p) => new Date(p.published_at as string))
        .sort((a, b) => b.getTime() - a.getTime());

      const dueDate = publishedDates.length
        ? nextWednesday(publishedDates[0])
        : nextWednesday(new Date());

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today < dueDate) return;

      const n = pending.title.match(/^(\d+)/)?.[1];
      setDue({
        label: n ? `LinkedIn post ${n}` : `Your next LinkedIn post ("${pending.title}")`,
        dueDate,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!due || dismissed) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLate = Math.round((today.getTime() - due.dueDate.getTime()) / 86400000);
  const slotText =
    daysLate === 0
      ? "the weekly Wednesday slot is today"
      : daysLate === 1
        ? "the weekly Wednesday slot passed yesterday"
        : `the weekly Wednesday slot was ${due.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}, ${daysLate} days ago`;

  return (
    <div className="flex items-center gap-3 p-4 rounded-sm border border-border bg-secondary">
      <Linkedin className="w-5 h-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{due.label} is due</p>
        <p className="text-xs text-muted-foreground">
          {slotText}. It's ready to publish whenever you are.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={() => navigate("/foundation/linkedin")}>
        Open LinkedIn posts
      </Button>
      <button
        type="button"
        aria-label="Dismiss reminder for today"
        className="text-muted-foreground hover:text-foreground p-1"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, new Date().toDateString());
          setDismissed(true);
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default LinkedInReminderBanner;
