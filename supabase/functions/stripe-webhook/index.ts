// Stripe webhook: keeps tier_subscriptions + user_storage_tiers in sync with Stripe events.
// Configure in Stripe dashboard: events checkout.session.completed, customer.subscription.updated/deleted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("payments_not_active", { status: 503 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, webhookSecret);
  } catch (err) {
    console.error("webhook signature verification failed", err);
    return new Response(`bad signature: ${(err as Error).message}`, { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const upsertSubscription = async (sub: Stripe.Subscription, fallbackTierId?: string, fallbackUserId?: string) => {
    const userId = (sub.metadata?.user_id as string) || fallbackUserId;
    const tierId = (sub.metadata?.tier_id as string) || fallbackTierId;
    if (!userId || !tierId) {
      console.warn("subscription missing user_id/tier_id metadata", sub.id);
      return;
    }

    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

    await admin.from("tier_subscriptions").upsert(
      {
        user_id: userId,
        tier_id: tierId,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        status: sub.status,
        current_period_end: periodEnd,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
      },
      { onConflict: "user_id" },
    );

    // Apply tier to user_storage_tiers when active/trialing; downgrade to free otherwise.
    if (["active", "trialing"].includes(sub.status)) {
      await admin.from("user_storage_tiers").upsert(
        { user_id: userId, tier_id: tierId },
        { onConflict: "user_id" },
      );
    } else if (["canceled", "unpaid", "incomplete_expired"].includes(sub.status)) {
      const { data: free } = await admin.from("storage_tiers").select("id").eq("slug", "free").maybeSingle();
      if (free) {
        await admin.from("user_storage_tiers").upsert(
          { user_id: userId, tier_id: free.id },
          { onConflict: "user_id" },
        );
      }
    }
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertSubscription(
            sub,
            session.metadata?.tier_id as string | undefined,
            (session.client_reference_id || session.metadata?.user_id) as string | undefined,
          );
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub);
        break;
      }
      default:
        // Ignore other events
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webhook handler error", err);
    return new Response(`handler error: ${(err as Error).message}`, { status: 500 });
  }
});
