CREATE TABLE public.foundation_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT,
  share_token TEXT UNIQUE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.foundation_documents TO authenticated;
GRANT ALL ON public.foundation_documents TO service_role;

ALTER TABLE public.foundation_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foundation can view documents" ON public.foundation_documents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'foundation'));
CREATE POLICY "Foundation can insert documents" ON public.foundation_documents
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'foundation') AND uploaded_by = auth.uid());
CREATE POLICY "Foundation can update documents" ON public.foundation_documents
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'foundation')) WITH CHECK (public.has_role(auth.uid(), 'foundation'));
CREATE POLICY "Foundation can delete documents" ON public.foundation_documents
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'foundation'));

CREATE TRIGGER update_foundation_documents_updated_at
  BEFORE UPDATE ON public.foundation_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Foundation can read foundation docs files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'foundation-documents' AND public.has_role(auth.uid(), 'foundation'));
CREATE POLICY "Foundation can upload foundation docs files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'foundation-documents' AND public.has_role(auth.uid(), 'foundation'));
CREATE POLICY "Foundation can update foundation docs files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'foundation-documents' AND public.has_role(auth.uid(), 'foundation'));
CREATE POLICY "Foundation can delete foundation docs files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'foundation-documents' AND public.has_role(auth.uid(), 'foundation'));