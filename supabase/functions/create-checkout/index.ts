// Creates a Stripe Checkout session for upgrading to a paid storage tier.
// Gracefully no-ops with a 503 + "payments_not_active" code until STRIPE_SECRET_KEY is set.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error: "payments_not_active",
          message: "Paid subscriptions are not yet active. Activation pending bank account setup.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const tierSlug: string = body.tier_slug;
    if (!tierSlug || typeof tierSlug !== "string") {
      return new Response(JSON.stringify({ error: "missing_tier_slug" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseService);
    const { data: tier, error: tierErr } = await admin
      .from("storage_tiers")
      .select("id, slug, name, stripe_price_id, monthly_price_eur")
      .eq("slug", tierSlug)
      .maybeSingle();

    if (tierErr || !tier) {
      return new Response(JSON.stringify({ error: "tier_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!tier.stripe_price_id) {
      return new Response(
        JSON.stringify({ error: "tier_not_configured", message: `Tier "${tier.name}" has no Stripe price linked yet.` }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Reuse existing customer if present
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const origin = req.headers.get("origin") || "https://globalartistregistry.org";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/storage-tiers?checkout=success&tier=${tier.slug}`,
      cancel_url: `${origin}/storage-tiers?checkout=cancelled`,
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id, tier_id: tier.id, tier_slug: tier.slug } },
      metadata: { user_id: user.id, tier_id: tier.id, tier_slug: tier.slug },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error", err);
    return new Response(JSON.stringify({ error: "internal_error", message: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
