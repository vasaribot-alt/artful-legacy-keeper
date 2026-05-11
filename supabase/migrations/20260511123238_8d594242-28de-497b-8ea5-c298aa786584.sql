
-- 1. CR number columns
ALTER TABLE public.cr_submissions ADD COLUMN IF NOT EXISTS cr_number integer;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS cr_number integer;
CREATE INDEX IF NOT EXISTS idx_artworks_owner_cr ON public.artworks(owner_id, cr_number);
CREATE INDEX IF NOT EXISTS idx_cr_submissions_owner_cr ON public.cr_submissions(artist_owner_id, cr_number);

-- 2. Public submissions: allow anon to submit (text-only, status forced to submitted, no submitter user)
CREATE POLICY "Public can create submissions"
  ON public.cr_submissions
  FOR INSERT
  TO anon
  WITH CHECK (
    status = 'submitted'
    AND submitted_by IS NULL
    AND artist_owner_id IS NOT NULL
  );

-- 3. Public profile lookup helper (resolve GAR or UUID to artist_owner_id + display name) without exposing the full table.
CREATE OR REPLACE FUNCTION public.lookup_cr_artist(_query text)
RETURNS TABLE(user_id uuid, full_name text, global_artist_id integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.global_artist_id
  FROM public.profiles p
  WHERE
    -- by UUID
    (CASE WHEN _query ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
          THEN p.user_id = _query::uuid ELSE false END)
    -- by numeric GAR
    OR (CASE WHEN _query ~ '^\d+$' THEN p.global_artist_id = _query::int ELSE false END)
  LIMIT 1;
$$;

-- 4. Image upload storage policies for committee/owner on artwork-images bucket
-- Path convention: cr-submissions/{artist_owner_id}/{submission_id}/{filename}
CREATE POLICY "CR committee can read submission images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'artwork-images'
    AND name LIKE 'cr-submissions/%'
    AND (
      (split_part(name, '/', 2))::uuid = auth.uid()
      OR has_registrar_access(auth.uid(), (split_part(name, '/', 2))::uuid)
    )
  );

CREATE POLICY "CR committee can upload submission images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artwork-images'
    AND name LIKE 'cr-submissions/%'
    AND (
      (split_part(name, '/', 2))::uuid = auth.uid()
      OR has_registrar_access(auth.uid(), (split_part(name, '/', 2))::uuid)
    )
  );

CREATE POLICY "CR committee can delete submission images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'artwork-images'
    AND name LIKE 'cr-submissions/%'
    AND (
      (split_part(name, '/', 2))::uuid = auth.uid()
      OR has_registrar_access(auth.uid(), (split_part(name, '/', 2))::uuid)
    )
  );
