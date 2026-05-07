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
  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
      body: {
        priceId,
        amountCents,
        kind,
        email,
        returnUrl,
        environment: stripeEnvironment,
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Failed to create donation checkout");
    }
    return data.clientSecret;
  };

  return (
    <div className="w-full">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
