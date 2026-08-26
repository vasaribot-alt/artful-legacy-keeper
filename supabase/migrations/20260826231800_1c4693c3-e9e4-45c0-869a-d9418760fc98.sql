UPDATE public.cr_submission_images
SET storage_path = regexp_replace(storage_path, '^cr-submissions/', '')
WHERE storage_path LIKE 'cr-submissions/%';