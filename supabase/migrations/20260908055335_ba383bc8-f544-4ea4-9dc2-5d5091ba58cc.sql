DROP POLICY IF EXISTS "Anyone can view public donors" ON public.donors;
REVOKE SELECT ON public.donors FROM anon;

CREATE OR REPLACE FUNCTION public.get_public_donors()
RETURNS TABLE (
  id uuid,
  full_name text,
  tier public.donor_tier,
  message text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.full_name, d.tier, d.message, d.created_at
  FROM public.donors d
  WHERE d.is_public = true
  ORDER BY d.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_donors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_donors() TO anon, authenticated;