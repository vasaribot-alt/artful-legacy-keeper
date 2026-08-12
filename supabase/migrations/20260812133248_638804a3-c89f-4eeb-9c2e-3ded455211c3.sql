ALTER TABLE public.artist_invites
  ADD COLUMN IF NOT EXISTS email_subject text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;