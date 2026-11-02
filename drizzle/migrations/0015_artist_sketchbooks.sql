CREATE TABLE public.sketchbooks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 role_context text NOT NULL DEFAULT 'artist' CHECK (role_context = 'artist'),
 title text NOT NULL CHECK (length(trim(title)) > 0),
 year integer,
 notes text,
 pdf_path text NOT NULL,
 file_size bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
 page_count integer NOT NULL CHECK (page_count > 0),
 pages jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(pages) = 'array'),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (pdf_path LIKE owner_id::text || '/artist/%')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sketchbooks TO authenticated;
GRANT ALL ON public.sketchbooks TO service_role;
ALTER TABLE public.sketchbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artist and appointed registrar manage sketchbooks" ON public.sketchbooks FOR ALL TO authenticated USING (role_context = 'artist' AND (auth.uid() = owner_id OR public.has_registrar_access(auth.uid(), owner_id))) WITH CHECK (role_context = 'artist' AND public.has_role(owner_id, 'artist') AND (auth.uid() = owner_id OR public.has_registrar_access(auth.uid(), owner_id)));
CREATE INDEX sketchbooks_owner_role ON public.sketchbooks(owner_id, role_context);
CREATE POLICY "Private sketchbook files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sketchbooks' AND (storage.foldername(name))[2] = 'artist' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid)));
CREATE POLICY "Private sketchbook files upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sketchbooks' AND (storage.foldername(name))[2] = 'artist' AND public.has_role(((storage.foldername(name))[1])::uuid, 'artist') AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid)));
CREATE POLICY "Private sketchbook files delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'sketchbooks' AND (storage.foldername(name))[2] = 'artist' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid)));
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(_user_id uuid)
 RETURNS TABLE(source text, bytes bigint, file_count bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 IF NOT (auth.uid() = _user_id OR public.has_registrar_access(auth.uid(), _user_id) OR auth.role() = 'service_role') THEN RETURN; END IF;
 RETURN QUERY
 SELECT 'artwork-image'::text, COALESCE(SUM(COALESCE(ai.original_size, ai.file_size, 0)),0)::bigint, COUNT(*)::bigint FROM artwork_images ai JOIN artworks a ON a.id=ai.artwork_id WHERE a.owner_id=_user_id
 UNION ALL SELECT 'artwork-document',COALESCE(SUM(ad.file_size),0)::bigint,COUNT(*)::bigint FROM artwork_documents ad JOIN artworks a ON a.id=ad.artwork_id WHERE a.owner_id=_user_id
 UNION ALL SELECT 'exhibition-image',COALESCE(SUM(COALESCE(ei.original_size,ei.file_size,0)),0)::bigint,COUNT(*)::bigint FROM exhibition_images ei JOIN exhibitions e ON e.id=ei.exhibition_id WHERE e.user_id=_user_id
 UNION ALL SELECT 'exhibition-document',COALESCE(SUM(ed.file_size),0)::bigint,COUNT(*)::bigint FROM exhibition_documents ed JOIN exhibitions e ON e.id=ed.exhibition_id WHERE e.user_id=_user_id
 UNION ALL SELECT 'catalogue-cover',COALESCE(SUM(c.cover_file_size),0)::bigint,COUNT(*) FILTER (WHERE c.cover_image_path IS NOT NULL)::bigint FROM catalogues c WHERE c.user_id=_user_id
 UNION ALL SELECT 'cv-image',COALESCE(SUM(COALESCE(cei.original_size,cei.file_size,0)),0)::bigint,COUNT(*)::bigint FROM cv_entry_images cei JOIN cv_entries ce ON ce.id=cei.cv_entry_id JOIN profiles p ON p.id=ce.profile_id WHERE p.user_id=_user_id
 UNION ALL SELECT 'correspondence-original',COALESCE(SUM(ci.file_size),0)::bigint,COUNT(*)::bigint FROM correspondence_imports ci WHERE ci.owner_id=_user_id
 UNION ALL SELECT 'correspondence-attachment',COALESCE(SUM(ca.file_size),0)::bigint,COUNT(*)::bigint FROM correspondence_attachments ca WHERE ca.owner_id=_user_id
 UNION ALL SELECT 'sketchbook', COALESCE(SUM(s.file_size + COALESCE((SELECT SUM((p->>'size')::bigint) FROM jsonb_array_elements(s.pages) p),0)),0)::bigint,COALESCE(SUM(1 + jsonb_array_length(s.pages)),0)::bigint FROM sketchbooks s WHERE s.owner_id=_user_id AND s.role_context='artist';
END;
$function$;
REVOKE ALL ON FUNCTION public.get_user_storage_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_storage_usage(uuid) TO authenticated, service_role;