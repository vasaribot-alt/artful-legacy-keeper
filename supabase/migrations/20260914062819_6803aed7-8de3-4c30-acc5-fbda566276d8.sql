CREATE POLICY "Anyone can view published website artworks"
  ON public.artworks FOR SELECT TO anon, authenticated
  USING (
    COALESCE(role_context, 'artist') = 'artist'
    AND EXISTS (
      SELECT 1 FROM public.artist_websites w
      WHERE w.user_id = artworks.owner_id AND w.is_enabled = true
    )
  );

CREATE POLICY "Anyone can view published website artwork images"
  ON public.artwork_images FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artworks a
      JOIN public.artist_websites w ON w.user_id = a.owner_id
      WHERE a.id = artwork_images.artwork_id
        AND COALESCE(a.role_context, 'artist') = 'artist'
        AND w.is_enabled = true
    )
  );