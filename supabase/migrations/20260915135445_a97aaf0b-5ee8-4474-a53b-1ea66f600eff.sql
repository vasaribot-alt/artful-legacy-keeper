create or replace function public.get_onboarding_progress()
returns table(
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
  artworks bigint,
  artworks_with_image bigint,
  exhibitions bigint,
  cv_entries bigint,
  website_enabled boolean,
  last_activity timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
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
    (select count(*) from public.artworks a where a.owner_id = p.user_id),
    (select count(distinct a.id) from public.artworks a
       join public.artwork_images i on i.artwork_id = a.id
      where a.owner_id = p.user_id),
    (select count(*) from public.exhibitions e where e.user_id = p.user_id),
    (select count(*) from public.cv_entries c where c.profile_id = p.id),
    coalesce((select w.is_enabled from public.artist_websites w where w.user_id = p.user_id limit 1), false),
    greatest(
      p.updated_at,
      (select max(a.updated_at) from public.artworks a where a.owner_id = p.user_id),
      (select max(e.updated_at) from public.exhibitions e where e.user_id = p.user_id)
    )
  from public.profiles p
  where public.has_role(auth.uid(), 'foundation')
  order by p.created_at desc
$$;

revoke all on function public.get_onboarding_progress() from public, anon;
grant execute on function public.get_onboarding_progress() to authenticated;