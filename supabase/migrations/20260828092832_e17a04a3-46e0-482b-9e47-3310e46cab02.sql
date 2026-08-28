CREATE OR REPLACE FUNCTION public.has_gallery_workspace_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'foundation')
    OR public.has_role(_user_id, 'gallery')
    OR public.has_role(_user_id, 'institution')
    OR EXISTS (
      SELECT 1 FROM public.donations
      WHERE user_id = _user_id
        AND status = 'completed'
        AND kind IN ('one_off', 'monthly', 'annual')
    )
    OR EXISTS (
      SELECT 1 FROM public.donation_subscriptions
      WHERE user_id = _user_id
        AND kind IN ('monthly', 'annual', 'collector_access')
        AND status IN ('active', 'trialing')
        AND (current_period_end IS NULL OR current_period_end > now())
    );
$$;