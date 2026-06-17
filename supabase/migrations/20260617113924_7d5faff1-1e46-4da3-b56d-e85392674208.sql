
ALTER TABLE public.artist_invites
  ADD COLUMN IF NOT EXISTS born integer,
  ADD COLUMN IF NOT EXISTS died integer,
  ADD COLUMN IF NOT EXISTS ranking text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS studio_address text,
  ADD COLUMN IF NOT EXISTS galleries text[],
  ADD COLUMN IF NOT EXISTS cv_text text,
  ADD COLUMN IF NOT EXISTS social_links jsonb,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS email_draft text,
  ADD COLUMN IF NOT EXISTS enrichment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS enrichment_sources jsonb;
