ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_deceased boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS death_year integer,
  ADD COLUMN IF NOT EXISTS committee_connected boolean NOT NULL DEFAULT false;