CREATE TABLE public.artist_websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  slug text NOT NULL,
  site_title text,
  tagline text,
  about_text text,
  contact_options jsonb NOT NULL DEFAULT '{"email": true, "phone": false, "gallery": true}'::jsonb,
  artwork_ids uuid[],
  custom_domain text,
  custom_domain_status text NOT NULL DEFAULT 'none',
  billing_status text NOT NULL DEFAULT 'not_required',
  setup_fee_paid_at timestamptz,
  legacy_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (slug),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  CONSTRAINT custom_domain_status_check CHECK (custom_domain_status IN ('none','pending','approved')),
  CONSTRAINT billing_status_check CHECK (billing_status IN ('not_required','pending','active','legacy'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_websites TO authenticated;
GRANT ALL ON public.artist_websites TO service_role;

ALTER TABLE public.artist_websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists manage own website"
  ON public.artist_websites FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Foundation can view all websites"
  ON public.artist_websites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can update websites"
  ON public.artist_websites FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'))
  WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE TRIGGER update_artist_websites_updated_at
  BEFORE UPDATE ON public.artist_websites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_artist_site(_key text)
RETURNS TABLE(
  user_id uuid,
  slug text,
  site_title text,
  tagline text,
  about_text text,
  contact_options jsonb,
  artwork_ids uuid[],
  legacy_mode boolean,
  full_name text,
  avatar_url text,
  birth_year integer,
  city text,
  country text,
  email text,
  phone_prefix text,
  phone text,
  website text,
  biography text,
  social_media_links jsonb,
  galleries jsonb,
  contact_visibility jsonb,
  global_artist_id integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.user_id, w.slug, w.site_title, w.tagline, w.about_text,
    w.contact_options, w.artwork_ids, w.legacy_mode,
    p.full_name, p.avatar_url, p.birth_year, p.city, p.country,
    p.email, p.phone_prefix, p.phone, p.website, p.biography,
    p.social_media_links, p.galleries, p.contact_visibility, p.global_artist_id
  FROM public.artist_websites w
  JOIN public.profiles p ON p.user_id = w.user_id
  WHERE w.is_enabled = true
    AND (
      w.slug = lower(_key)
      OR (w.custom_domain_status = 'approved' AND lower(w.custom_domain) = lower(_key))
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_artist_site(text) TO anon, authenticated, service_role;