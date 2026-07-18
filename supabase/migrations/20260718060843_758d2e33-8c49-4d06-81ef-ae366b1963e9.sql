
-- 1) Extend artworks with valuation & structured location fields (collector context)
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS purchase_price numeric,
  ADD COLUMN IF NOT EXISTS original_retail_price numeric,
  ADD COLUMN IF NOT EXISTS acquisition_cost numeric,
  ADD COLUMN IF NOT EXISTS current_market_value numeric,
  ADD COLUMN IF NOT EXISTS estimated_value numeric,
  ADD COLUMN IF NOT EXISTS appraised_value numeric,
  ADD COLUMN IF NOT EXISTS appraised_at date,
  ADD COLUMN IF NOT EXISTS appraised_by text,
  ADD COLUMN IF NOT EXISTS last_sold_price numeric,
  ADD COLUMN IF NOT EXISTS last_sold_at date,
  ADD COLUMN IF NOT EXISTS replacement_value numeric,
  ADD COLUMN IF NOT EXISTS reserve_price numeric,
  ADD COLUMN IF NOT EXISTS restoration_cost numeric,
  ADD COLUMN IF NOT EXISTS location_facility text,
  ADD COLUMN IF NOT EXISTS location_room text,
  ADD COLUMN IF NOT EXISTS location_cabinet text,
  ADD COLUMN IF NOT EXISTS location_shelf text,
  ADD COLUMN IF NOT EXISTS location_box text,
  ADD COLUMN IF NOT EXISTS env_temperature_note text,
  ADD COLUMN IF NOT EXISTS env_humidity_note text,
  ADD COLUMN IF NOT EXISTS env_light_note text,
  ADD COLUMN IF NOT EXISTS hazard_notes text;

-- 2) Extend artwork_location_history with structured move data + who/why
ALTER TABLE public.artwork_location_history
  ADD COLUMN IF NOT EXISTS moved_by uuid,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS to_facility text,
  ADD COLUMN IF NOT EXISTS to_room text,
  ADD COLUMN IF NOT EXISTS to_cabinet text,
  ADD COLUMN IF NOT EXISTS to_shelf text,
  ADD COLUMN IF NOT EXISTS to_box text;

-- 3) Lending-to-museums flag on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS willing_to_lend boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lending_notes text;
