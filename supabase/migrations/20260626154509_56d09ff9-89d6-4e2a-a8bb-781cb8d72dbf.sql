
DROP POLICY IF EXISTS "Users can view artwork images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view artwork images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view artwork images" ON storage.objects;

CREATE POLICY "Owners can view own artwork images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'artwork-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Public can view founding/CR artwork images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'artwork-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.founding_artists fa
        WHERE (fa.user_id)::text = (storage.foldername(name))[1]
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.user_id)::text = (storage.foldername(name))[1]
          AND p.cr_listed = true
      )
    )
  );

DROP POLICY IF EXISTS "Auth users can view exhibition documents" ON storage.objects;
CREATE POLICY "Owners can view own exhibition documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'exhibition-documents'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

DROP POLICY IF EXISTS "Auth users can upload exhibition documents" ON storage.objects;
CREATE POLICY "Auth users can upload own exhibition documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'exhibition-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Auth users can upload exhibition images" ON storage.objects;
CREATE POLICY "Auth users can upload own exhibition images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'exhibition-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can upload cv images" ON storage.objects;
CREATE POLICY "Users can upload own cv images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cv-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

REVOKE SELECT (buyer_name, sold_date, price, provenance, artwork_location) ON public.artworks FROM anon;
REVOKE SELECT (buyer_name, sold_date, provenance, artwork_location) ON public.edition_items FROM anon;
REVOKE SELECT (email) ON public.cr_committee_members FROM anon;
REVOKE SELECT (email) ON public.donors FROM anon;

CREATE POLICY "Anyone can submit a major gift inquiry"
  ON public.major_gift_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    internal_notes IS NULL
    AND (status IS NULL OR status = 'new')
  );
