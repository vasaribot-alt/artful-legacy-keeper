DROP FUNCTION IF EXISTS public.get_onboarding_progress();

CREATE FUNCTION public.get_onboarding_progress()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  city text,
  country text,
  created_at timestamptz,
  id_verified boolean,
  has_biography boolean,
  has_avatar boolean,
  roles text[],
  artist_artworks bigint,
  artist_artworks_with_image bigint,
  collector_artworks bigint,
  collector_artworks_with_image bigint,
  exhibitions bigint,
  cv_entries bigint,
  website_enabled boolean,
  last_activity timestamptz,
  discovered_website text,
  letter_status text,
  letter_subject text,
  letter_body text,
  letter_sent_at timestamptz,
  letter_role text,
  collector_has_registrar boolean,
  registrar_verified boolean,
  registrar_profile_complete boolean,
  registrar_available boolean,
  registrar_has_cv boolean,
  registrar_clients bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.full_name,
    p.email,
    p.city,
    p.country,
    p.created_at,
    coalesce(p.id_verified, false),
    (p.biography is not null and length(btrim(p.biography)) > 20),
    (p.avatar_url is not null and length(btrim(p.avatar_url)) > 0),
    coalesce((select array_agg(r.role::text) from public.user_roles r where r.user_id = p.user_id), '{}'::text[]),
    (select count(*) from public.artworks a where a.owner_id = p.user_id and a.role_context = 'artist'),
    (select count(distinct a.id) from public.artworks a join public.artwork_images i on i.artwork_id = a.id where a.owner_id = p.user_id and a.role_context = 'artist'),
    (select count(*) from public.artworks a where a.owner_id = p.user_id and a.role_context = 'collector'),
    (select count(distinct a.id) from public.artworks a join public.artwork_images i on i.artwork_id = a.id where a.owner_id = p.user_id and a.role_context = 'collector'),
    (select count(*) from public.exhibitions e where e.user_id = p.user_id),
    (select count(*) from public.cv_entries c where c.profile_id = p.id),
    coalesce((select w.is_enabled from public.artist_websites w where w.user_id = p.user_id limit 1), false),
    greatest(p.updated_at, (select max(a.updated_at) from public.artworks a where a.owner_id = p.user_id), (select max(e.updated_at) from public.exhibitions e where e.user_id = p.user_id)),
    coalesce(nullif(btrim(coalesce(p.website, '')), ''), l.discovered_website),
    l.status,
    l.subject,
    l.body,
    l.sent_at,
    l.account_role::text,
    exists(select 1 from public.registrar_access ra where ra.owner_id = p.user_id and ra.status = 'approved'),
    coalesce((select rp.is_verified from public.registrar_profiles rp where rp.user_id = p.user_id), false),
    exists(select 1 from public.registrar_profiles rp where rp.user_id = p.user_id and length(btrim(coalesce(rp.professional_statement, ''))) > 20),
    coalesce((select rp.available_for_freelance from public.registrar_profiles rp where rp.user_id = p.user_id), false),
    exists(select 1 from public.registrar_profiles rp where rp.user_id = p.user_id and length(btrim(coalesce(rp.cv_file_path, ''))) > 0),
    (select count(*) from public.registrar_access ra where ra.registrar_id = p.user_id and ra.status = 'approved')
  FROM public.profiles p
  LEFT JOIN public.welcome_letters l ON l.user_id = p.user_id
  WHERE public.has_role(auth.uid(), 'foundation')
  ORDER BY p.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_onboarding_progress() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_onboarding_progress() TO authenticated;