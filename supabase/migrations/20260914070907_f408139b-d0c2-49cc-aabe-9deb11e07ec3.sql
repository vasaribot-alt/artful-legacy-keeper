ALTER TABLE public.artist_websites
  ADD COLUMN home_layout text NOT NULL DEFAULT 'portrait',
  ADD COLUMN home_featured_artwork_id uuid REFERENCES public.artworks(id) ON DELETE SET NULL,
  ADD COLUMN home_artwork_ids uuid[];

ALTER TABLE public.artist_websites
  ADD CONSTRAINT artist_websites_home_layout_check
  CHECK (home_layout IN ('portrait', 'featured', 'grid'));

DROP FUNCTION public.get_artist_site(text);

CREATE FUNCTION public.get_artist_site(_key text)
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
  global_artist_id integer,
  home_layout text,
  home_featured_artwork_id uuid,
  home_artwork_ids uuid[]
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
    p.social_media_links, p.galleries, p.contact_visibility, p.global_artist_id,
    w.home_layout, w.home_featured_artwork_id, w.home_artwork_ids
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