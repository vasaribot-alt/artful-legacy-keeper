
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_year integer,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS contacts text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS social_media_links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS galleries jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS biography text,
  ADD COLUMN IF NOT EXISTS cv text,
  ADD COLUMN IF NOT EXISTS chronology text;
