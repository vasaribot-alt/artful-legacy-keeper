// Public donation checkout: one-off (any amount) OR recurring (monthly/annual via priceId).
// No auth required — anyone can donate. If a logged-in user is detected via Authorization
// header, we link the donation to their account.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await req.json().catch(() => ({}));
    const env: StripeEnv = body.environment === "live" ? "live" : "sandbox";
    const returnUrl: string = body.returnUrl || "https://globalartistregistry.org/donate/thanks?session_id={CHECKOUT_SESSION_ID}";

    // Two modes: priceId (recurring product) OR amountCents (one-off custom amount)
    const priceId: string | undefined = body.priceId;
    const amountCents: number | undefined = body.amountCents;
    const kind: string = body.kind || "one_off"; // one_off | monthly | annual | collector_access

    if (!priceId && !amountCents) {
      return json({ error: "Provide priceId or amountCents" }, 400);
    }
    if (amountCents && (amountCents < 100 || amountCents > 1_000_000_00)) {
      return json({ error: "Invalid amount" }, 400);
    }

    // Resolve optional logged-in user
    let userId: string | undefined;
    let customerEmail: string | undefined = body.email;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        userId = data.user.id;
        customerEmail = customerEmail || data.user.email || undefined;
      }
    }

    const stripe = createStripeClient(env);

    let sessionPayload: any;

    if (priceId) {
      // Resolve human-readable priceId to Stripe price via lookup_keys
      const prices = await stripe.prices.list({ lookup_keys: [priceId] });
      if (!prices.data.length) return json({ error: "Price not found" }, 404);
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === "recurring";

      sessionPayload = {
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: returnUrl,
        ...(customerEmail && { customer_email: customerEmail }),
        metadata: {
          kind,
          ...(userId && { userId }),
        },
        ...(isRecurring && {
          subscription_data: {
            metadata: { kind, ...(userId && { userId }) },
            description: "Annual gift to the Global Artist Registry Foundation (Dutch stichting). Donations are gifts and not subject to VAT.",
          },
        }),
      };
    } else {
      // One-off custom amount via price_data
      sessionPayload = {
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: { name: "Donation to the Global Artist Registry Foundation" },
            unit_amount: amountCents!,
          },
          quantity: 1,
        }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: returnUrl,
        ...(customerEmail && { customer_email: customerEmail }),
        metadata: { kind: "one_off", ...(userId && { userId }) },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);

    return json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("create-donation-checkout error", err);
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
