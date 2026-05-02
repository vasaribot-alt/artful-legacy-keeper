
-- Add size + optimized derivative columns to image tables
ALTER TABLE public.artwork_images
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS original_size bigint,
  ADD COLUMN IF NOT EXISTS web_storage_path text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer;

ALTER TABLE public.exhibition_images
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS original_size bigint,
  ADD COLUMN IF NOT EXISTS web_storage_path text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer;

ALTER TABLE public.cv_entry_images
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS original_size bigint,
  ADD COLUMN IF NOT EXISTS web_storage_path text,
  ADD COLUMN IF NOT EXISTS mime_type text;

-- Catalogue cover size (for usage accounting)
ALTER TABLE public.catalogues
  ADD COLUMN IF NOT EXISTS cover_file_size bigint;

-- Web-optimized buckets (public for fast CDN serving)
INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork-images-web', 'artwork-images-web', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('exhibition-images-web', 'exhibition-images-web', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for artwork-images-web
CREATE POLICY "Anyone can view artwork web images"
ON storage.objects FOR SELECT
USING (bucket_id = 'artwork-images-web');

CREATE POLICY "Owners can upload artwork web images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'artwork-images-web' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can update artwork web images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'artwork-images-web' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can delete artwork web images"
ON storage.objects FOR DELETE
USING (bucket_id = 'artwork-images-web' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for exhibition-images-web
CREATE POLICY "Anyone can view exhibition web images"
ON storage.objects FOR SELECT
USING (bucket_id = 'exhibition-images-web');

CREATE POLICY "Owners can upload exhibition web images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'exhibition-images-web' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can update exhibition web images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'exhibition-images-web' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can delete exhibition web images"
ON storage.objects FOR DELETE
USING (bucket_id = 'exhibition-images-web' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Per-user storage usage function
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(_user_id uuid)
RETURNS TABLE(
  source text,
  bytes bigint,
  file_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  WHERE p.user_id = _user_id;
$$;
