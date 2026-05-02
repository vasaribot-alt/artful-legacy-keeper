
-- Storage tiers table — Foundation-managed, viewable by all
CREATE TABLE public.storage_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  quota_bytes bigint NOT NULL,
  monthly_price_eur numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active storage tiers"
ON public.storage_tiers FOR SELECT
USING (is_active = true);

CREATE POLICY "Foundation can manage storage tiers"
ON public.storage_tiers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'foundation'::app_role))
WITH CHECK (has_role(auth.uid(), 'foundation'::app_role));

-- Per-user tier assignment (default = Free)
CREATE TABLE public.user_storage_tiers (
  user_id uuid PRIMARY KEY,
  tier_id uuid NOT NULL REFERENCES public.storage_tiers(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid
);

ALTER TABLE public.user_storage_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tier"
ON public.user_storage_tiers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Foundation views all tiers"
ON public.user_storage_tiers FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'foundation'::app_role));

CREATE POLICY "Foundation manages tiers"
ON public.user_storage_tiers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'foundation'::app_role))
WITH CHECK (has_role(auth.uid(), 'foundation'::app_role));

-- Seed default tiers (track-only pricing per user preference)
INSERT INTO public.storage_tiers (slug, name, quota_bytes, monthly_price_eur, description, display_order) VALUES
  ('free',    'Free',    2147483648,    0, 'Get started — 2 GB',                     1),
  ('pro',     'Pro',     53687091200,   0, 'Active practice — 50 GB',                2),
  ('archive', 'Archive', 536870912000,  0, 'Comprehensive archive — 500 GB',         3),
  ('estate',  'Estate',  2199023255552, 0, 'Legacy and estate scale — 2 TB',         4);

-- Function: get a user's effective tier + total usage in one call
CREATE OR REPLACE FUNCTION public.get_user_storage_status(_user_id uuid)
RETURNS TABLE(
  tier_slug text,
  tier_name text,
  quota_bytes bigint,
  used_bytes bigint,
  file_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH tier AS (
    SELECT st.slug, st.name, st.quota_bytes
    FROM public.user_storage_tiers ust
    JOIN public.storage_tiers st ON st.id = ust.tier_id
    WHERE ust.user_id = _user_id
    UNION ALL
    SELECT st.slug, st.name, st.quota_bytes
    FROM public.storage_tiers st
    WHERE st.slug = 'free'
      AND NOT EXISTS (SELECT 1 FROM public.user_storage_tiers WHERE user_id = _user_id)
    LIMIT 1
  ),
  usage AS (
    SELECT COALESCE(SUM(bytes),0)::bigint AS used_bytes,
           COALESCE(SUM(file_count),0)::bigint AS file_count
    FROM public.get_user_storage_usage(_user_id)
  )
  SELECT t.slug, t.name, t.quota_bytes, u.used_bytes, u.file_count
  FROM tier t, usage u;
$$;
