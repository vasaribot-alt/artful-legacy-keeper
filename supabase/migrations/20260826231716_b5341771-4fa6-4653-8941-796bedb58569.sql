CREATE OR REPLACE FUNCTION public.list_galleries_admin()
RETURNS TABLE(
  id uuid,
  name text,
  city text,
  country text,
  established_year integer,
  rank integer,
  email text,
  phone text,
  website text,
  contact_name text,
  contact_title text,
  enrichment_status text,
  enrichment_attempted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name, g.city, g.country, g.established_year, g.rank,
         g.email, g.phone, g.website, g.contact_name, g.contact_title,
         g.enrichment_status, g.enrichment_attempted_at
  FROM public.galleries g
  WHERE public.has_role(auth.uid(), 'foundation'::public.app_role);
$$;

REVOKE ALL ON FUNCTION public.list_galleries_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_galleries_admin() TO authenticated;