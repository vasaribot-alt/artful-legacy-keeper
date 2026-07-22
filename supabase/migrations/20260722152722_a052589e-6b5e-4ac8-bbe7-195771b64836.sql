
-- Backfill artwork_images.original_size / file_size from storage.objects
UPDATE public.artwork_images ai
SET original_size = COALESCE(NULLIF(ai.original_size,0), (o.metadata->>'size')::bigint),
    file_size     = COALESCE(NULLIF(ai.file_size,0),     (o.metadata->>'size')::bigint)
FROM storage.objects o
WHERE o.bucket_id = 'artwork-images'
  AND o.name = ai.storage_path
  AND (ai.original_size IS NULL OR ai.original_size = 0 OR ai.file_size IS NULL OR ai.file_size = 0);

-- Backfill exhibition_images
UPDATE public.exhibition_images ei
SET original_size = COALESCE(NULLIF(ei.original_size,0), (o.metadata->>'size')::bigint),
    file_size     = COALESCE(NULLIF(ei.file_size,0),     (o.metadata->>'size')::bigint)
FROM storage.objects o
WHERE o.bucket_id = 'exhibition-images'
  AND o.name = ei.storage_path
  AND (ei.original_size IS NULL OR ei.original_size = 0 OR ei.file_size IS NULL OR ei.file_size = 0);

-- Backfill artwork_documents
UPDATE public.artwork_documents ad
SET file_size = (o.metadata->>'size')::bigint
FROM storage.objects o
WHERE o.bucket_id = 'artwork-documents'
  AND o.name = ad.storage_path
  AND (ad.file_size IS NULL OR ad.file_size = 0);

-- Backfill exhibition_documents
UPDATE public.exhibition_documents ed
SET file_size = (o.metadata->>'size')::bigint
FROM storage.objects o
WHERE o.bucket_id = 'exhibition-documents'
  AND o.name = ed.storage_path
  AND (ed.file_size IS NULL OR ed.file_size = 0);

-- Backfill catalogues.cover_file_size
UPDATE public.catalogues c
SET cover_file_size = (o.metadata->>'size')::bigint
FROM storage.objects o
WHERE o.bucket_id = 'catalogue-covers'
  AND o.name = c.cover_image_path
  AND c.cover_image_path IS NOT NULL
  AND (c.cover_file_size IS NULL OR c.cover_file_size = 0);

-- Backfill cv_entry_images
UPDATE public.cv_entry_images cei
SET original_size = COALESCE(NULLIF(cei.original_size,0), (o.metadata->>'size')::bigint),
    file_size     = COALESCE(NULLIF(cei.file_size,0),     (o.metadata->>'size')::bigint)
FROM storage.objects o
WHERE o.bucket_id = 'cv-images'
  AND o.name = cei.storage_path
  AND (cei.original_size IS NULL OR cei.original_size = 0 OR cei.file_size IS NULL OR cei.file_size = 0);
