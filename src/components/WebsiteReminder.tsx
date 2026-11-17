import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/** Dashboard reminder for artists who have not enabled a GARF website yet. */
export function WebsiteReminder({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const dismissKey = `websiteReminderDismissed:${userId}`;
  const [hidden, setHidden] = useState(() => localStorage.getItem(dismissKey) === "1");
  const [show, setShow] = useState(false);

  useEffect(() => {
    supabase
      .from("artist_websites")
      .select("is_enabled")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => { if (!error) setShow(!data?.is_enabled); });
  }, [userId]);

  if (hidden || !show) return null;

  return (
    <section className="mb-6 border border-border rounded-sm p-5 bg-secondary/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Your website on GARF</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Every artist gets a free website built from their GARF records, and listed in our artist directory.
            Already have your own website? Link your own address so visitors find you there.
          </p>
        </div>
        <button
          aria-label="Hide website reminder"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => { localStorage.setItem(dismissKey, "1"); setHidden(true); }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate("/my-website")}>Create my GARF website</Button>
        <Button size="sm" variant="outline" onClick={() => navigate("/my-website#custom-domain")}>Link my own website</Button>
      </div>
    </section>
  );
}
