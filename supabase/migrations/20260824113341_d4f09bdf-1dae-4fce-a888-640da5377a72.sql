CREATE OR REPLACE FUNCTION public.get_partner_org_breakdown(_slug text, _key text)
 RETURNS TABLE(slug text, name text, country text, members_joined bigint, members_id_verified bigint, artworks_archived bigint, exhibitions_recorded bigint, last_join_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org public.partner_organisations;
BEGIN
  SELECT o.* INTO _org FROM public.partner_organisations o
  WHERE lower(o.slug) = lower(_slug) AND o.is_active;

  IF _org.id IS NULL OR _key IS NULL OR _key <> _org.dashboard_key THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.slug,
    c.name,
    c.country,
    (SELECT count(*) FROM public.profiles p WHERE p.partner_org_id = c.id),
    (SELECT count(*) FROM public.profiles p WHERE p.partner_org_id = c.id AND p.id_verified),
    (SELECT count(*) FROM public.artworks a
      JOIN public.profiles p ON p.user_id = a.owner_id
      WHERE p.partner_org_id = c.id),
    (SELECT count(*) FROM public.exhibitions e
      JOIN public.profiles p ON p.user_id = e.user_id
      WHERE p.partner_org_id = c.id),
    (SELECT max(p.created_at) FROM public.profiles p WHERE p.partner_org_id = c.id)
  FROM public.partner_organisations c
  WHERE c.parent_id = _org.id AND c.is_active
  ORDER BY c.name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_partner_org_stats(_slug text, _key text)
 RETURNS TABLE(name text, country text, logo_url text, members_joined bigint, members_id_verified bigint, artworks_archived bigint, exhibitions_recorded bigint, first_join_at timestamp with time zone, last_join_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org public.partner_organisations;
  _ids uuid[];
BEGIN
  SELECT o.* INTO _org FROM public.partner_organisations o
  WHERE lower(o.slug) = lower(_slug) AND o.is_active;

  IF _org.id IS NULL OR _key IS NULL OR _key <> _org.dashboard_key THEN
    RETURN;
  END IF;

  SELECT array_agg(s.id) INTO _ids FROM (
    SELECT _org.id AS id
    UNION
    SELECT o.id FROM public.partner_organisations o WHERE o.parent_id = _org.id
  ) s;

  RETURN QUERY
  SELECT
    _org.name,
    _org.country,
    _org.logo_url,
    (SELECT count(*) FROM public.profiles p WHERE p.partner_org_id = ANY(_ids)),
    (SELECT count(*) FROM public.profiles p WHERE p.partner_org_id = ANY(_ids) AND p.id_verified),
    (SELECT count(*) FROM public.artworks a
      JOIN public.profiles p ON p.user_id = a.owner_id
      WHERE p.partner_org_id = ANY(_ids)),
    (SELECT count(*) FROM public.exhibitions e
      JOIN public.profiles p ON p.user_id = e.user_id
      WHERE p.partner_org_id = ANY(_ids)),
    (SELECT min(p.created_at) FROM public.profiles p WHERE p.partner_org_id = ANY(_ids)),
    (SELECT max(p.created_at) FROM public.profiles p WHERE p.partner_org_id = ANY(_ids));
END;
$function$;