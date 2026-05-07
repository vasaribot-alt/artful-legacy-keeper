// Webhook for built-in payments (donations + collector access subscriptions).
// Stripe sends events here at /payments-webhook?env=sandbox|live
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function kindFromMetadata(meta: Record<string, string> | undefined, fallback: string): string {
  return meta?.kind || fallback;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const userId: string | null = session.metadata?.userId || null;
  const kind = kindFromMetadata(session.metadata, session.mode === "subscription" ? "monthly" : "one_off");
  const amountCents = session.amount_total ?? null;

  if (session.mode === "payment") {
    // One-off donation
    await getSupabase().from("donations").upsert(
      {
        user_id: userId,
        email: session.customer_details?.email || session.customer_email || null,
        donor_name: session.customer_details?.name || null,
        amount_cents: amountCents,
        currency: (session.currency || "eur").toLowerCase(),
        kind,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent || null,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        status: "completed",
        environment: env,
      },
      { onConflict: "stripe_session_id" },
    );
  }
  // Subscription mode is handled by customer.subscription.* events
}

async function handleSubscriptionUpsert(sub: any, env: StripeEnv) {
  const userId = sub.metadata?.userId;
  if (!userId) {
    console.warn("subscription has no userId metadata", sub.id);
    return;
  }
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const amountCents = item?.price?.unit_amount ?? null;
  const kind = kindFromMetadata(sub.metadata, "monthly");
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;

  await getSupabase().from("donation_subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      price_id: priceId,
      product_id: productId,
      kind,
      status: sub.status,
      amount_cents: amountCents,
      currency: (item?.price?.currency || "eur").toLowerCase(),
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function handleSubscriptionDeleted(sub: any, env: StripeEnv) {
  await getSupabase()
    .from("donation_subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", sub.id)
    .eq("environment", env);
}

async function handleInvoicePaid(invoice: any, env: StripeEnv) {
  // Record each successful subscription invoice as a donation row for the registry/receipts
  if (!invoice.subscription) return;
  const userId = invoice.subscription_details?.metadata?.userId || invoice.metadata?.userId || null;
  const kind = invoice.subscription_details?.metadata?.kind || invoice.metadata?.kind || "monthly";
  await getSupabase().from("donations").upsert(
    {
      user_id: userId,
      email: invoice.customer_email || null,
      donor_name: invoice.customer_name || null,
      amount_cents: invoice.amount_paid ?? 0,
      currency: (invoice.currency || "eur").toLowerCase(),
      kind,
      stripe_session_id: `invoice_${invoice.id}`,
      stripe_subscription_id: invoice.subscription,
      stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : null,
      status: "completed",
      environment: env,
    },
    { onConflict: "stripe_session_id" },
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("payments-webhook: invalid env", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), { status: 200 });
  }
  const env: StripeEnv = rawEnv;
  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, env);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object, env);
        break;
      default:
        console.log("payments-webhook: unhandled", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("payments-webhook error", e);
    return new Response("Webhook error", { status: 400 });
  }
});
