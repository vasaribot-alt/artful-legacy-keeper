-- Create storage bucket for artwork images
INSERT INTO storage.buckets (id, name, public) VALUES ('artwork-images', 'artwork-images', true);

-- Create artwork_images table
CREATE TABLE public.artwork_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artwork_images ENABLE ROW LEVEL SECURITY;

-- RLS: owners can manage images on their artworks
CREATE POLICY "Owners can view artwork images"
  ON public.artwork_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.artworks WHERE artworks.id = artwork_images.artwork_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can insert artwork images"
  ON public.artwork_images FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.artworks WHERE artworks.id = artwork_images.artwork_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can delete artwork images"
  ON public.artwork_images FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.artworks WHERE artworks.id = artwork_images.artwork_id AND artworks.owner_id = auth.uid()));

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users can upload artwork images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'artwork-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view artwork images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'artwork-images');

CREATE POLICY "Users can delete own artwork images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'artwork-images' AND (storage.foldername(name))[1] = auth.uid()::text);