-- Pricing + Stripe linkage on tiers
ALTER TABLE public.storage_tiers
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_product_id text;

UPDATE public.storage_tiers SET monthly_price_eur = 6   WHERE slug = 'pro'     AND monthly_price_eur = 0;
UPDATE public.storage_tiers SET monthly_price_eur = 20  WHERE slug = 'archive' AND monthly_price_eur = 0;
UPDATE public.storage_tiers SET monthly_price_eur = 60  WHERE slug = 'estate'  AND monthly_price_eur = 0;

-- Subscription tracking
CREATE TABLE IF NOT EXISTS public.tier_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier_id uuid NOT NULL REFERENCES public.storage_tiers(id),
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tier_subscriptions_user ON public.tier_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_tier_subscriptions_customer ON public.tier_subscriptions(stripe_customer_id);

ALTER TABLE public.tier_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription"
  ON public.tier_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies: only service role (edge functions) writes.

CREATE TRIGGER trg_tier_subscriptions_updated
  BEFORE UPDATE ON public.tier_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();