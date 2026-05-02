-- Create a table for user uploads not yet attached to any artwork/exhibition.
CREATE TABLE public.user_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role_context TEXT NOT NULL DEFAULT 'artist',
  storage_path TEXT NOT NULL,
  web_storage_path TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  original_size BIGINT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  series TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_uploads_user ON public.user_uploads(user_id, role_context);

ALTER TABLE public.user_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own uploads"
  ON public.user_uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own uploads"
  ON public.user_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own uploads"
  ON public.user_uploads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own uploads"
  ON public.user_uploads FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Registrars view granted uploads"
  ON public.user_uploads FOR SELECT
  TO authenticated
  USING (public.has_registrar_access(auth.uid(), user_id));

CREATE POLICY "Registrars insert granted uploads"
  ON public.user_uploads FOR INSERT
  TO authenticated
  WITH CHECK (public.has_registrar_access(auth.uid(), user_id));

CREATE POLICY "Registrars delete granted uploads"
  ON public.user_uploads FOR DELETE
  TO authenticated
  USING (public.has_registrar_access(auth.uid(), user_id));
