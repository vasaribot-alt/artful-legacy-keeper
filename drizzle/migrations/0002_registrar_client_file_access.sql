-- Allow registrars with approved access to manage files stored under a client's folder
CREATE POLICY "Registrars manage client artwork documents select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'artwork-documents'
  AND public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Registrars manage client artwork documents insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'artwork-documents'
  AND public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Registrars manage client artwork documents delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'artwork-documents'
  AND public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Registrars upload client artwork images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'artwork-images'
  AND public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Registrars delete client artwork images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'artwork-images'
  AND public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
