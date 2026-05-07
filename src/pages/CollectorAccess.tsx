import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DonationCheckout } from "@/components/payments/DonationCheckout";
import { PaymentTestModeBanner } from "@/components/payments/PaymentTestModeBanner";
import { stripeEnvironment } from "@/lib/payments";

export default function CollectorAccess() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login?redirect=/collector-access");
        return;
      }
      setUserEmail(user.email || undefined);
      const { data } = await supabase.rpc("has_collector_access", {
        _user_id: user.id,
        _env: stripeEnvironment,
      });
      setHasAccess(Boolean(data));
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Collector Access</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        {hasAccess ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-border">
              <Check className="h-5 w-5" />
            </div>
            <h1 className="font-serif text-3xl">Your collector access is active.</h1>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Thank you for supporting the Foundation. You can manage your annual gift below.
            </p>
            <div className="mt-8">
              <Button onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
            </div>
          </div>
        ) : !showCheckout ? (
          <>
            <div className="mb-10 text-center">
              <h1 className="font-serif text-4xl leading-tight sm:text-5xl">Collector Collection Management</h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                Manage your collection with archival-grade tools used by museums and estates.
                Access is reserved for supporters of the Foundation through an annual gift of €75.
              </p>
            </div>

            <div className="mx-auto max-w-md rounded-lg border border-border p-8">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Annual gift</p>
              <p className="mt-2 font-serif text-5xl">€75<span className="text-base text-muted-foreground"> / year</span></p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Full collector workspace",
                  "Provenance, location & condition tracking",
                  "Linked artist & artwork records",
                  "Archival cloud storage",
                  "Foundation receipt — no VAT (gift to Dutch stichting)",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#7ac143]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="mt-8 h-12 w-full rounded-lg bg-[#7ac143] text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#6aab36]"
                onClick={() => setShowCheckout(true)}
              >
                Continue to gift
              </Button>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-[#7ac143]" />
                Secure payment via Stripe
              </p>
            </div>
          </>
        ) : (
          <div>
            <button
              onClick={() => setShowCheckout(false)}
              className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="rounded-lg border border-border bg-card p-1 sm:p-4">
              <DonationCheckout
                priceId="collector_access_annual"
                kind="collector_access"
                email={userEmail}
                returnUrl={`${window.location.origin}/collector-access?activated=1`}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
