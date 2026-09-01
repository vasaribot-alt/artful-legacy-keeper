DROP POLICY IF EXISTS "Anyone can view founding artist artworks" ON public.artworks;
CREATE POLICY "Anyone can view founding artist artworks"
ON public.artworks
FOR SELECT
USING (
  coalesce(role_context, 'artist') = 'artist'
  AND EXISTS (
    SELECT 1 FROM public.founding_artists fa
    WHERE fa.user_id = artworks.owner_id
  )
);

DROP POLICY IF EXISTS "Anyone can view CR-listed artworks" ON public.artworks;
CREATE POLICY "Anyone can view CR-listed artworks"
ON public.artworks
FOR SELECT
TO anon, authenticated
USING (
  verification_status = 'verified'
  AND coalesce(role_context, 'artist') = 'artist'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = artworks.owner_id AND p.cr_listed = true
  )
);