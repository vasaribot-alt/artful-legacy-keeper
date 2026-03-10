
-- Add new artwork metadata columns
ALTER TABLE public.artworks
  ADD COLUMN is_unique boolean NOT NULL DEFAULT true,
  ADD COLUMN series text,
  ADD COLUMN sub_category text,
  ADD COLUMN support text,
  ADD COLUMN signed text,
  ADD COLUMN height numeric,
  ADD COLUMN width numeric,
  ADD COLUMN depth numeric,
  ADD COLUMN weight numeric,
  ADD COLUMN price numeric,
  ADD COLUMN currency text DEFAULT 'EUR',
  ADD COLUMN artwork_location text;
