CREATE TABLE public.partner_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  country text,
  contact_email text,
  website text,
  logo_url text,
  intro_text text,
  dashboard_key text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_organisations TO authenticated;
GRANT ALL ON public.partner_organisations TO service_role;

ALTER TABLE public.partner_organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foundation can manage partner organisations"
ON public.partner_organisations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'foundation'))
WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE TRIGGER update_partner_organisations_updated_at
BEFORE UPDATE ON public.partner_organisations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_org_id uuid REFERENCES public.partner_organisations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS profiles_partner_org_id_idx ON public.profiles(partner_org_id);

-- Public, safe lookup of a partner organisation for the branded join page
CREATE OR REPLACE FUNCTION public.get_partner_org_public(_slug text)
RETURNS TABLE(slug text, name text, country text, website text, logo_url text, intro_text text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.slug, o.name, o.country, o.website, o.logo_url, o.intro_text
  FROM public.partner_organisations o
  WHERE lower(o.slug) = lower(_slug) AND o.is_active
$$;

-- Aggregate-only stats for a partner board, gated by the private dashboard key
CREATE OR REPLACE FUNCTION public.get_partner_org_stats(_slug text, _key text)
RETURNS TABLE(
  name text,
  country text,
  logo_url text,
  members_joined bigint,
  members_id_verified bigint,
  artworks_archived bigint,
  exhibitions_recorded bigint,
  first_join_at timestamptz,
  last_join_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org public.partner_organisations;
BEGIN
  SELECT * INTO _org FROM public.partner_organisations
  WHERE lower(slug) = lower(_slug) AND is_active;

  IF _org.id IS NULL OR _key IS NULL OR _key <> _org.dashboard_key THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    _org.name,
    _org.country,
    _org.logo_url,
    (SELECT count(*) FROM public.profiles p WHERE p.partner_org_id = _org.id),
    (SELECT count(*) FROM public.profiles p WHERE p.partner_org_id = _org.id AND p.id_verified),
    (SELECT count(*) FROM public.artworks a
      JOIN public.profiles p ON p.user_id = a.owner_id
      WHERE p.partner_org_id = _org.id),
    (SELECT count(*) FROM public.exhibitions e
      JOIN public.profiles p ON p.user_id = e.owner_id
      WHERE p.partner_org_id = _org.id),
    (SELECT min(p.created_at) FROM public.profiles p WHERE p.partner_org_id = _org.id),
    (SELECT max(p.created_at) FROM public.profiles p WHERE p.partner_org_id = _org.id);
END;
$$;

-- Attach new sign-ups to the partner organisation they joined through
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _partner_id uuid;
  _slug text;
BEGIN
  _slug := NEW.raw_user_meta_data ->> 'partner_org';
  IF _slug IS NOT NULL AND _slug <> '' THEN
    SELECT id INTO _partner_id FROM public.partner_organisations
    WHERE lower(slug) = lower(_slug) AND is_active;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email, partner_org_id)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email, _partner_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'artist'));

  RETURN NEW;
END;
$function$;

INSERT INTO public.partner_organisations (slug, name, country, contact_email, website, intro_text)
VALUES
  ('iaa-usa', 'International Association of Art — United States', 'United States', 'president@iaa-usa.org', 'https://www.iaa-usa.org/', 'IAA-USA members are invited to create a free, permanent archive of their work with the Global Artist Registry Foundation.'),
  ('iaa-europe', 'IAA Europe', 'Europe', 'info@iaa-europe.eu', 'https://iaa-europe.eu/', 'Members of IAA Europe national committees are invited to create a free, permanent archive of their work with the Global Artist Registry Foundation.')
ON CONFLICT (slug) DO NOTHING;