CREATE OR REPLACE FUNCTION public.has_published_artist_site(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.artist_websites
    WHERE user_id = _user_id AND is_enabled = true
  )
$$;

REVOKE ALL ON FUNCTION public.has_published_artist_site(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_published_artist_site(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can view published website artworks" ON public.artworks;
CREATE POLICY "Anyone can view published website artworks"
  ON public.artworks FOR SELECT TO anon, authenticated
  USING (
    COALESCE(role_context, 'artist') = 'artist'
    AND public.has_published_artist_site(owner_id)
  );

DROP POLICY IF EXISTS "Anyone can view published website artwork images" ON public.artwork_images;
CREATE POLICY "Anyone can view published website artwork images"
  ON public.artwork_images FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artworks a
      WHERE a.id = artwork_images.artwork_id
        AND COALESCE(a.role_context, 'artist') = 'artist'
        AND public.has_published_artist_site(a.owner_id)
    )
  );