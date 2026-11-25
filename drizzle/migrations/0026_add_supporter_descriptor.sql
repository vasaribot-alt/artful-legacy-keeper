ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS descriptor text;
DROP FUNCTION IF EXISTS public.get_public_donors();
CREATE FUNCTION public.get_public_donors()
 RETURNS TABLE(id uuid, full_name text, tier donor_tier, message text, descriptor text, created_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT d.id, d.full_name, d.tier, d.message, d.descriptor, d.created_at
  FROM public.donors d WHERE d.is_public = true ORDER BY d.created_at ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_donors() TO anon, authenticated;