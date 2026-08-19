ALTER TABLE public.user_uploads
  ADD COLUMN IF NOT EXISTS folder_label text,
  ADD COLUMN IF NOT EXISTS folder_number integer,
  ADD COLUMN IF NOT EXISTS folder_path text;

CREATE INDEX IF NOT EXISTS user_uploads_folder_label_idx ON public.user_uploads (user_id, folder_label);