import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, stripeEnvironment } from "@/lib/payments";
import { supabase } from "@/integrations/supabase/client";

interface DonationCheckoutProps {
  /** Recurring price ID (e.g. "donation_monthly_25", "collector_access_annual") OR omit and pass amountCents */
  priceId?: string;
  /** One-off custom amount in cents */
  amountCents?: number;
  /** Donation kind for reporting: one_off | monthly | annual | collector_access */
  kind: "one_off" | "monthly" | "annual" | "collector_access";
  email?: string;
  returnUrl: string;
}

export function DonationCheckout({ priceId, amountCents, kind, email, returnUrl }: DonationCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
        body: { priceId, amountCents, kind, email, returnUrl, environment: stripeEnvironment },
      });
      if (cancelled) return;
      if (error || !data?.clientSecret) {
        setUnavailable(true);
        return;
      }
      setClientSecret(data.clientSecret);
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceId, amountCents, kind, email, returnUrl]);

  if (unavailable) {
    return (
      <div className="w-full rounded-sm border border-border bg-secondary/50 p-5">
        <p className="text-sm font-medium">Card payments are not available yet</p>
        <p className="text-sm text-muted-foreground mt-1.5">
          We are completing our banking setup. In the meantime you can give by bank transfer using the
          details further down this page, or write to us at{" "}
          <a href="mailto:outreach@globalartistregistry.org" className="underline">
            outreach@globalartistregistry.org
          </a>{" "}
          and we will help you.
        </p>
      </div>
    );
  }

  if (!clientSecret) {
    return <div className="w-full h-24 rounded-sm bg-secondary animate-pulse" />;
  }

  return (
    <div className="w-full">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
