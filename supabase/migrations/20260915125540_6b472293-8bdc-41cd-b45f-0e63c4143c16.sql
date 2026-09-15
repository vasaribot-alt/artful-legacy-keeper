GRANT SELECT ON public.exhibition_images TO authenticated;
GRANT SELECT ON public.exhibition_images TO anon;
GRANT ALL ON public.exhibition_images TO service_role;

CREATE POLICY "Published website exhibition images are public"
ON public.exhibition_images
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exhibitions
    WHERE exhibitions.id = exhibition_images.exhibition_id
      AND public.has_published_artist_site(exhibitions.user_id)
  )
);