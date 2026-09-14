ALTER TABLE public.artist_websites
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.artist_news (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  news_date date NOT NULL DEFAULT current_date,
  image_url text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_news TO authenticated;
GRANT SELECT ON public.artist_news TO anon;
GRANT ALL ON public.artist_news TO service_role;

ALTER TABLE public.artist_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists manage their own news"
  ON public.artist_news FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Published news of enabled websites is public"
  ON public.artist_news FOR SELECT TO anon, authenticated
  USING (is_published = true AND public.has_published_artist_site(user_id));

CREATE TRIGGER update_artist_news_updated_at
  BEFORE UPDATE ON public.artist_news
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS artist_news_user_date_idx ON public.artist_news (user_id, news_date DESC);

DROP FUNCTION IF EXISTS public.get_artist_site(text);

CREATE OR REPLACE FUNCTION public.get_artist_site(_key text)
 RETURNS TABLE(user_id uuid, slug text, site_title text, tagline text, about_text text, contact_options jsonb, artwork_ids uuid[], legacy_mode boolean, full_name text, avatar_url text, birth_year integer, city text, country text, email text, phone_prefix text, phone text, website text, biography text, social_media_links jsonb, galleries jsonb, contact_visibility jsonb, global_artist_id integer, home_layout text, home_featured_artwork_id uuid, home_artwork_ids uuid[], sections jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    w.user_id, w.slug, w.site_title, w.tagline, w.about_text,
    w.contact_options, w.artwork_ids, w.legacy_mode,
    p.full_name, p.avatar_url, p.birth_year, p.city, p.country,
    p.email, p.phone_prefix, p.phone, p.website, p.biography,
    p.social_media_links, p.galleries, p.contact_visibility, p.global_artist_id,
    w.home_layout, w.home_featured_artwork_id, w.home_artwork_ids, w.sections
  FROM public.artist_websites w
  JOIN public.profiles p ON p.user_id = w.user_id
  WHERE w.is_enabled = true
    AND (
      w.slug = lower(_key)
      OR (w.custom_domain_status = 'approved' AND lower(w.custom_domain) = lower(_key))
    )
  LIMIT 1;
$function$;