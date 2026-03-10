
-- Create storage bucket for artwork documents
INSERT INTO storage.buckets (id, name, public) VALUES ('artwork-documents', 'artwork-documents', false);

-- Create artwork_documents table
CREATE TABLE public.artwork_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artwork_documents ENABLE ROW LEVEL SECURITY;

-- RLS: owners can manage documents on their artworks
CREATE POLICY "Owners can view artwork documents"
  ON public.artwork_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.artworks WHERE artworks.id = artwork_documents.artwork_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can insert artwork documents"
  ON public.artwork_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.artworks WHERE artworks.id = artwork_documents.artwork_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can delete artwork documents"
  ON public.artwork_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.artworks WHERE artworks.id = artwork_documents.artwork_id AND artworks.owner_id = auth.uid()));

-- Storage policies for documents bucket
CREATE POLICY "Users can upload artwork documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'artwork-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own artwork documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'artwork-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own artwork documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'artwork-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
