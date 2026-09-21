CREATE TABLE public.welcome_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'queued',
  discovered_website text,
  website_findings jsonb NOT NULL DEFAULT '{}'::jsonb,
  subject text,
  body text,
  drafted_at timestamptz,
  sent_at timestamptz,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.welcome_letters TO authenticated;
GRANT ALL ON public.welcome_letters TO service_role;

ALTER TABLE public.welcome_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foundation manages welcome letters"
ON public.welcome_letters
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'foundation'))
WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE TRIGGER welcome_letters_updated_at
BEFORE UPDATE ON public.welcome_letters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Queue a welcome letter for every new artist signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _partner_id uuid;
  _slug text;
  _role app_role;
BEGIN
  _slug := NEW.raw_user_meta_data ->> 'partner_org';
  IF _slug IS NOT NULL AND _slug <> '' THEN
    SELECT id INTO _partner_id FROM public.partner_organisations
    WHERE lower(slug) = lower(_slug) AND is_active;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email, partner_org_id)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email, _partner_id);

  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'artist');

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _role = 'artist' THEN
    INSERT INTO public.welcome_letters (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill a queued letter for artists who joined in the last 60 days
INSERT INTO public.welcome_letters (user_id)
SELECT p.user_id
FROM public.profiles p
WHERE p.created_at > now() - interval '60 days'
  AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'artist')
ON CONFLICT (user_id) DO NOTHING;

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
  artworks bigint,
  artworks_with_image bigint,
  exhibitions bigint,
  cv_entries bigint,
  website_enabled boolean,
  last_activity timestamptz,
  discovered_website text,
  letter_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    ),
    coalesce(nullif(btrim(coalesce(p.website, '')), ''), l.discovered_website),
    l.status
  from public.profiles p
  left join public.welcome_letters l on l.user_id = p.user_id
  where public.has_role(auth.uid(), 'foundation')
  order by p.created_at desc
$$;

REVOKE ALL ON FUNCTION public.get_onboarding_progress() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_onboarding_progress() TO authenticated;