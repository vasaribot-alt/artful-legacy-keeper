ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS ai_description text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS ai_described_at timestamptz;
ALTER TABLE public.exhibition_images ADD COLUMN IF NOT EXISTS ai_description text;
ALTER TABLE public.exhibition_images ADD COLUMN IF NOT EXISTS ai_described_at timestamptz;