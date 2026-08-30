import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function TrackedLinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const go = async () => {
      if (!code) {
        setFailed(true);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("resolve-tracked-link", {
          body: { code },
        });
        if (error) throw error;
        const destination = (data as { destination?: string } | null)?.destination;
        if (!destination) throw new Error("No destination");
        if (!cancelled) window.location.replace(destination);
      } catch (err) {
        console.error("Tracked link failed", err);
        if (!cancelled) setFailed(true);
      }
    };
    go();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        {failed ? (
          <>
            <h1 className="text-2xl font-serif">This link is no longer available</h1>
            <p className="text-sm text-muted-foreground">
              The link may have expired or been removed.
            </p>
            <Link to="/" className="text-sm underline">
              Go to the Global Artist Registry
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Opening…</p>
        )}
      </div>
    </div>
  );
}
