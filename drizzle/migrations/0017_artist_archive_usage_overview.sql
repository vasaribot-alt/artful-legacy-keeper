CREATE OR REPLACE FUNCTION public.get_artist_archive_usage()
RETURNS TABLE(user_id uuid, sketchbook_count bigint, archival_document_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id,
    (SELECT count(*) FROM public.sketchbooks s WHERE s.owner_id = p.user_id AND s.role_context = 'artist'),
    (SELECT count(*) FROM public.archival_documents d WHERE d.owner_id = p.user_id AND d.role_context = 'artist')
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'foundation')
    AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'artist');
$$;
REVOKE ALL ON FUNCTION public.get_artist_archive_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_artist_archive_usage() TO authenticated;
COMMENT ON FUNCTION public.get_artist_archive_usage() IS 'Foundation-only per-artist archive usage counts; exposes no document content or storage paths.';