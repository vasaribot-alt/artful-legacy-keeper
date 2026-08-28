import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type State = "loading" | "valid" | "invalid" | "already" | "done" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setState("invalid");
        return;
      }
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
        const response = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setState("invalid");
          return;
        }
        if (data?.already_unsubscribed || data?.used) {
          setState("already");
          return;
        }
        setEmail(data?.email ?? null);
        setState("valid");
      } catch {
        setState("error");
      }
    };
    validate();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setWorking(true);
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    setWorking(false);
    setState(error ? "error" : "done");
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Global Artist Registry Foundation
          </p>
          <CardTitle className="font-serif text-2xl font-normal">
            {state === "done" ? "You are unsubscribed" : "Unsubscribe"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {state === "loading" && <p>Checking your link…</p>}

          {state === "valid" && (
            <>
              <p>
                Confirm that you no longer wish to receive notification emails from the
                foundation{email ? ` at ${email}` : ""}. Sign in and password emails will still
                reach you.
              </p>
              <Button onClick={confirm} disabled={working}>
                {working ? "Working…" : "Confirm unsubscribe"}
              </Button>
            </>
          )}

          {state === "already" && <p>This address is already unsubscribed. Nothing more to do.</p>}

          {state === "done" && (
            <p>
              You will no longer receive notification emails from the foundation. You can write to
              us at any time if you change your mind.
            </p>
          )}

          {state === "invalid" && (
            <p>This unsubscribe link is not valid or has expired. Please use the link in the most recent email you received.</p>
          )}

          {state === "error" && <p>Something went wrong. Please try again in a moment.</p>}
        </CardContent>
      </Card>
    </main>
  );
};

export default Unsubscribe;
