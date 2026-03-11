
-- Create sequence for GAWID starting at 100001
CREATE SEQUENCE IF NOT EXISTS public.global_artwork_id_seq START WITH 100001;

-- Add global_artwork_id column to artworks
ALTER TABLE public.artworks
ADD COLUMN global_artwork_id integer NOT NULL DEFAULT nextval('global_artwork_id_seq'::regclass);

-- Create unique index
CREATE UNIQUE INDEX artworks_global_artwork_id_key ON public.artworks (global_artwork_id);
