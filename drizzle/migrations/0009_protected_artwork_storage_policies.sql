-- Read access to the private bucket holding watermarked copies of protected works.
-- Owner, granted registrar and foundation staff may read; only the service role
-- (the protect-artwork-image function) ever writes.

CREATE POLICY "Owners read protected artwork images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'artwork-images-protected'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Registrars read protected artwork images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'artwork-images-protected'
  AND public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Foundation reads protected artwork images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'artwork-images-protected'
  AND public.has_role(auth.uid(), 'foundation'::public.app_role)
);
