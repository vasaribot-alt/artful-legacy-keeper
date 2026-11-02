CREATE SEQUENCE public.archival_document_reference_seq START 100001;
CREATE TABLE public.archival_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL,
 role_context text NOT NULL DEFAULT 'artist' CHECK (role_context='artist'),
 reference_number text NOT NULL UNIQUE DEFAULT ('GAD-' || lpad(nextval('public.archival_document_reference_seq')::text,8,'0')),
 title text NOT NULL CHECK(length(trim(title))>0), document_type text NOT NULL DEFAULT 'Other',
 document_date text, context text, creator text, rights_note text,
 storage_path text NOT NULL UNIQUE, file_name text NOT NULL, file_type text NOT NULL,
 file_size bigint NOT NULL CHECK(file_size>=0), is_public boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(storage_path LIKE owner_id::text || '/artist/%')
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.archival_documents TO authenticated;
GRANT SELECT ON public.archival_documents TO anon;
GRANT ALL ON public.archival_documents TO service_role;
GRANT USAGE ON SEQUENCE public.archival_document_reference_seq TO authenticated,service_role;
ALTER TABLE public.archival_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner and registrar manage archival documents" ON public.archival_documents FOR ALL TO authenticated USING(role_context='artist' AND (owner_id=auth.uid() OR public.has_registrar_access(auth.uid(),owner_id))) WITH CHECK(role_context='artist' AND public.has_role(owner_id,'artist') AND (owner_id=auth.uid() OR public.has_registrar_access(auth.uid(),owner_id)));
CREATE POLICY "Published archival documents" ON public.archival_documents FOR SELECT TO anon,authenticated USING(role_context='artist' AND is_public);
CREATE INDEX archival_documents_owner_role ON public.archival_documents(owner_id,role_context);
CREATE FUNCTION public.guard_archival_document_publication() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.owner_id<>OLD.owner_id OR NEW.reference_number<>OLD.reference_number OR NEW.storage_path<>OLD.storage_path OR NEW.role_context<>OLD.role_context THEN RAISE EXCEPTION 'Archive identity and reference cannot be changed'; END IF;
  IF NEW.is_public IS DISTINCT FROM OLD.is_public AND auth.uid() IS DISTINCT FROM NEW.owner_id AND auth.role()<>'service_role' THEN RAISE EXCEPTION 'Only the artist may change public visibility'; END IF;
 ELSE
  IF NEW.is_public AND auth.uid() IS DISTINCT FROM NEW.owner_id AND auth.role()<>'service_role' THEN RAISE EXCEPTION 'Only the artist may publish documents'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_archival_document_publication BEFORE INSERT OR UPDATE ON public.archival_documents FOR EACH ROW EXECUTE FUNCTION public.guard_archival_document_publication();
CREATE POLICY "Archival document owner read files" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='archival-documents' AND (storage.foldername(name))[2]='artist' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.has_registrar_access(auth.uid(),((storage.foldername(name))[1])::uuid)));
CREATE POLICY "Published archival document files" ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='archival-documents' AND EXISTS(SELECT 1 FROM public.archival_documents d WHERE d.storage_path=name AND d.role_context='artist' AND d.is_public));
CREATE POLICY "Upload archival document files" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='archival-documents' AND (storage.foldername(name))[2]='artist' AND public.has_role(((storage.foldername(name))[1])::uuid,'artist') AND ((storage.foldername(name))[1]=auth.uid()::text OR public.has_registrar_access(auth.uid(),((storage.foldername(name))[1])::uuid)));
CREATE POLICY "Delete archival document files" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='archival-documents' AND (storage.foldername(name))[2]='artist' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.has_registrar_access(auth.uid(),((storage.foldername(name))[1])::uuid)));
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(_user_id uuid)
 RETURNS TABLE(source text, bytes bigint, file_count bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
 UNION ALL SELECT 'sketchbook', COALESCE(SUM(s.file_size + COALESCE((SELECT SUM((p->>'size')::bigint) FROM jsonb_array_elements(s.pages) p),0)),0)::bigint,COALESCE(SUM(1 + jsonb_array_length(s.pages)),0)::bigint FROM sketchbooks s WHERE s.owner_id=_user_id AND s.role_context='artist'
 UNION ALL SELECT 'archival-document',COALESCE(SUM(d.file_size),0)::bigint,COUNT(*)::bigint FROM archival_documents d WHERE d.owner_id=_user_id AND d.role_context='artist';
END; $function$;
REVOKE ALL ON FUNCTION public.get_user_storage_usage(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_user_storage_usage(uuid) TO authenticated,service_role;