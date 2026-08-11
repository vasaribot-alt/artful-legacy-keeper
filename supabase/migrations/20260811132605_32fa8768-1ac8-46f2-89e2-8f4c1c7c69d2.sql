DROP FUNCTION IF EXISTS public.get_verified_registrars();

CREATE OR REPLACE FUNCTION public.get_verified_registrars()
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, city text, country text, specializations text[], languages text[], geographic_coverage text, professional_statement text, credentials text, years_experience integer, arcs_member boolean, arcs_member_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    rp.user_id,
    p.full_name,
    p.avatar_url,
    p.city,
    p.country,
    rp.specializations,
    rp.languages,
    rp.geographic_coverage,
    rp.professional_statement,
    rp.credentials,
    rp.years_experience,
    rp.arcs_member,
    rp.arcs_member_id
  FROM public.registrar_profiles rp
  JOIN public.profiles p ON p.user_id = rp.user_id
  WHERE rp.is_listed = true AND rp.is_verified = true
  ORDER BY p.full_name;
$function$;

GRANT EXECUTE ON FUNCTION public.get_verified_registrars() TO anon, authenticated, service_role;