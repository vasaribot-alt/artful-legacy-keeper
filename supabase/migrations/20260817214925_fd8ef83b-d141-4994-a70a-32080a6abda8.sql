-- ============ Imports ============
CREATE TABLE public.correspondence_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_context text NOT NULL DEFAULT 'artist',
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'uploaded',
  message_count integer NOT NULL DEFAULT 0,
  ingested_count integer NOT NULL DEFAULT 0,
  attachment_bytes bigint NOT NULL DEFAULT 0,
  date_from timestamptz,
  date_to timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.correspondence_imports TO authenticated;
GRANT ALL ON public.correspondence_imports TO service_role;
ALTER TABLE public.correspondence_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their imports" ON public.correspondence_imports
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Approved registrars view imports" ON public.correspondence_imports
  FOR SELECT TO authenticated USING (public.has_registrar_access(auth.uid(), owner_id));

CREATE TRIGGER update_correspondence_imports_updated_at
  BEFORE UPDATE ON public.correspondence_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_corr_imports_owner ON public.correspondence_imports(owner_id, created_at DESC);

-- ============ Messages ============
CREATE TABLE public.correspondence_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_id uuid REFERENCES public.correspondence_imports(id) ON DELETE SET NULL,
  role_context text NOT NULL DEFAULT 'artist',
  message_id_header text,
  thread_key text,
  sent_at timestamptz,
  from_name text,
  from_email text,
  to_emails text[] NOT NULL DEFAULT '{}',
  cc_emails text[] NOT NULL DEFAULT '{}',
  subject text,
  body_text text,
  body_html_path text,
  has_attachments boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'private',
  embargo_until_year integer,
  notes text,
  search_tsv tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT correspondence_visibility_chk CHECK (visibility IN ('private','embargoed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.correspondence_messages TO authenticated;
GRANT ALL ON public.correspondence_messages TO service_role;
ALTER TABLE public.correspondence_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their messages" ON public.correspondence_messages
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Approved registrars view messages" ON public.correspondence_messages
  FOR SELECT TO authenticated USING (public.has_registrar_access(auth.uid(), owner_id));

CREATE OR REPLACE FUNCTION public.correspondence_messages_tsv()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_tsv := to_tsvector('simple',
    coalesce(NEW.subject,'') || ' ' ||
    coalesce(NEW.from_name,'') || ' ' ||
    coalesce(NEW.from_email,'') || ' ' ||
    coalesce(array_to_string(NEW.to_emails,' '),'') || ' ' ||
    coalesce(array_to_string(NEW.cc_emails,' '),'') || ' ' ||
    coalesce(NEW.body_text,'')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_correspondence_messages_tsv
  BEFORE INSERT OR UPDATE ON public.correspondence_messages
  FOR EACH ROW EXECUTE FUNCTION public.correspondence_messages_tsv();

CREATE TRIGGER update_correspondence_messages_updated_at
  BEFORE UPDATE ON public.correspondence_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_corr_msg_search ON public.correspondence_messages USING GIN (search_tsv);
CREATE INDEX idx_corr_msg_owner_sent ON public.correspondence_messages(owner_id, sent_at DESC);
CREATE INDEX idx_corr_msg_thread ON public.correspondence_messages(owner_id, thread_key);
CREATE UNIQUE INDEX idx_corr_msg_dedupe ON public.correspondence_messages(owner_id, message_id_header)
  WHERE message_id_header IS NOT NULL;

-- ============ Attachments ============
CREATE TABLE public.correspondence_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.correspondence_messages(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint NOT NULL DEFAULT 0,
  sha256 text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.correspondence_attachments TO authenticated;
GRANT ALL ON public.correspondence_attachments TO service_role;
ALTER TABLE public.correspondence_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their attachments" ON public.correspondence_attachments
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Approved registrars view attachments" ON public.correspondence_attachments
  FOR SELECT TO authenticated USING (public.has_registrar_access(auth.uid(), owner_id));

CREATE INDEX idx_corr_att_message ON public.correspondence_attachments(message_id);
CREATE INDEX idx_corr_att_hash ON public.correspondence_attachments(owner_id, sha256);

-- ============ Links ============
CREATE TABLE public.correspondence_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.correspondence_messages(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id uuid REFERENCES public.artworks(id) ON DELETE CASCADE,
  exhibition_id uuid REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  confidence numeric,
  reasoning text,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT corr_link_target_chk CHECK (
    (artwork_id IS NOT NULL AND exhibition_id IS NULL)
    OR (artwork_id IS NULL AND exhibition_id IS NOT NULL)
  ),
  CONSTRAINT corr_link_status_chk CHECK (status IN ('suggested','confirmed','rejected'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.correspondence_links TO authenticated;
GRANT ALL ON public.correspondence_links TO service_role;
ALTER TABLE public.correspondence_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their links" ON public.correspondence_links
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Approved registrars view links" ON public.correspondence_links
  FOR SELECT TO authenticated USING (public.has_registrar_access(auth.uid(), owner_id));
CREATE POLICY "Approved registrars review links" ON public.correspondence_links
  FOR UPDATE TO authenticated
  USING (public.has_registrar_access(auth.uid(), owner_id))
  WITH CHECK (public.has_registrar_access(auth.uid(), owner_id));

CREATE TRIGGER update_correspondence_links_updated_at
  BEFORE UPDATE ON public.correspondence_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX idx_corr_link_artwork ON public.correspondence_links(message_id, artwork_id)
  WHERE artwork_id IS NOT NULL;
CREATE UNIQUE INDEX idx_corr_link_exhibition ON public.correspondence_links(message_id, exhibition_id)
  WHERE exhibition_id IS NOT NULL;

-- ============ Storage policies ============
CREATE POLICY "Owners manage correspondence originals"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'correspondence-originals' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'correspondence-originals' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Registrars read correspondence originals"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'correspondence-originals'
    AND public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid));

CREATE POLICY "Owners manage correspondence attachments"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'correspondence-attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'correspondence-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Registrars read correspondence attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'correspondence-attachments'
    AND public.has_registrar_access(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- ============ Storage quota accounting ============
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(_user_id uuid)
 RETURNS TABLE(source text, bytes bigint, file_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 'artwork-image'::text AS source,
         COALESCE(SUM(COALESCE(ai.original_size, ai.file_size, 0)), 0)::bigint AS bytes,
         COUNT(*)::bigint AS file_count
  FROM artwork_images ai
  JOIN artworks a ON a.id = ai.artwork_id
  WHERE a.owner_id = _user_id
  UNION ALL
  SELECT 'artwork-document',
         COALESCE(SUM(file_size), 0)::bigint,
         COUNT(*)::bigint
  FROM artwork_documents ad
  JOIN artworks a ON a.id = ad.artwork_id
  WHERE a.owner_id = _user_id
  UNION ALL
  SELECT 'exhibition-image',
         COALESCE(SUM(COALESCE(ei.original_size, ei.file_size, 0)), 0)::bigint,
         COUNT(*)::bigint
  FROM exhibition_images ei
  JOIN exhibitions e ON e.id = ei.exhibition_id
  WHERE e.user_id = _user_id
  UNION ALL
  SELECT 'exhibition-document',
         COALESCE(SUM(file_size), 0)::bigint,
         COUNT(*)::bigint
  FROM exhibition_documents ed
  JOIN exhibitions e ON e.id = ed.exhibition_id
  WHERE e.user_id = _user_id
  UNION ALL
  SELECT 'catalogue-cover',
         COALESCE(SUM(cover_file_size), 0)::bigint,
         COUNT(*) FILTER (WHERE cover_image_path IS NOT NULL)::bigint
  FROM catalogues
  WHERE user_id = _user_id
  UNION ALL
  SELECT 'cv-image',
         COALESCE(SUM(COALESCE(cei.original_size, cei.file_size, 0)), 0)::bigint,
         COUNT(*)::bigint
  FROM cv_entry_images cei
  JOIN cv_entries ce ON ce.id = cei.cv_entry_id
  JOIN profiles p ON p.id = ce.profile_id
  WHERE p.user_id = _user_id
  UNION ALL
  SELECT 'correspondence-original',
         COALESCE(SUM(file_size), 0)::bigint,
         COUNT(*)::bigint
  FROM correspondence_imports
  WHERE owner_id = _user_id
  UNION ALL
  SELECT 'correspondence-attachment',
         COALESCE(SUM(file_size), 0)::bigint,
         COUNT(*)::bigint
  FROM correspondence_attachments
  WHERE owner_id = _user_id;
$function$;