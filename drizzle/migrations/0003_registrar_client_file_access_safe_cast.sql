CREATE OR REPLACE FUNCTION public.has_registrar_access_path(_registrar_id uuid, _owner_text text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _owner_text IS NULL OR _owner_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN false;
  END IF;
  RETURN public.has_registrar_access(_registrar_id, _owner_text::uuid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_registrar_access_path(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Registrars manage client artwork documents select" ON storage.objects;
DROP POLICY IF EXISTS "Registrars manage client artwork documents insert" ON storage.objects;
DROP POLICY IF EXISTS "Registrars manage client artwork documents delete" ON storage.objects;
DROP POLICY IF EXISTS "Registrars upload client artwork images" ON storage.objects;
DROP POLICY IF EXISTS "Registrars delete client artwork images" ON storage.objects;

CREATE POLICY "Registrars manage client artwork documents select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'artwork-documents' AND public.has_registrar_access_path(auth.uid(), (storage.foldername(name))[1]));

CREATE POLICY "Registrars manage client artwork documents insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'artwork-documents' AND public.has_registrar_access_path(auth.uid(), (storage.foldername(name))[1]));

CREATE POLICY "Registrars manage client artwork documents delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'artwork-documents' AND public.has_registrar_access_path(auth.uid(), (storage.foldername(name))[1]));

CREATE POLICY "Registrars upload client artwork images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'artwork-images' AND public.has_registrar_access_path(auth.uid(), (storage.foldername(name))[1]));

CREATE POLICY "Registrars delete client artwork images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'artwork-images' AND public.has_registrar_access_path(auth.uid(), (storage.foldername(name))[1]));
