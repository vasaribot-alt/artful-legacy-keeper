-- 1. Fix mutable search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 2. Restrict gallery contact columns to foundation staff via column-level grants
REVOKE SELECT ON public.galleries FROM authenticated;
GRANT SELECT (id, name, country, city, established_year, website, rank, created_at) ON public.galleries TO authenticated;
GRANT ALL ON public.galleries TO service_role;

DROP POLICY IF EXISTS "Anyone can view galleries" ON public.galleries;
CREATE POLICY "Authenticated users can view galleries"
  ON public.galleries FOR SELECT TO authenticated
  USING (true);

-- 3. Move CR submission images into a private bucket
CREATE POLICY "CR submission images readable by owner side"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cr-submission-images'
    AND (
      (split_part(name, '/', 1))::uuid = auth.uid()
      OR public.has_registrar_access(auth.uid(), (split_part(name, '/', 1))::uuid)
      OR public.has_role(auth.uid(), 'foundation'::public.app_role)
    )
  );

CREATE POLICY "CR submission images upload by owner side"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cr-submission-images'
    AND (
      (split_part(name, '/', 1))::uuid = auth.uid()
      OR public.has_registrar_access(auth.uid(), (split_part(name, '/', 1))::uuid)
      OR public.has_role(auth.uid(), 'foundation'::public.app_role)
    )
  );

CREATE POLICY "CR submission images delete by owner side"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cr-submission-images'
    AND (
      (split_part(name, '/', 1))::uuid = auth.uid()
      OR public.has_registrar_access(auth.uid(), (split_part(name, '/', 1))::uuid)
      OR public.has_role(auth.uid(), 'foundation'::public.app_role)
    )
  );

-- Retire the old public-bucket policies for cr-submissions paths
DROP POLICY IF EXISTS "CR committee can read submission images" ON storage.objects;
DROP POLICY IF EXISTS "CR committee can upload submission images" ON storage.objects;
DROP POLICY IF EXISTS "CR committee can delete submission images" ON storage.objects;