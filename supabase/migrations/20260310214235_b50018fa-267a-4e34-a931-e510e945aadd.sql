
-- Add a sequence for Global Artist IDs starting at 100001
CREATE SEQUENCE public.global_artist_id_seq START WITH 100001;

-- Add global_artist_id column to profiles
ALTER TABLE public.profiles ADD COLUMN global_artist_id integer UNIQUE DEFAULT nextval('public.global_artist_id_seq');

-- Backfill existing profiles
UPDATE public.profiles SET global_artist_id = nextval('public.global_artist_id_seq') WHERE global_artist_id IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.profiles ALTER COLUMN global_artist_id SET NOT NULL;
