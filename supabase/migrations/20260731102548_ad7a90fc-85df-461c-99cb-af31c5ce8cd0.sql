ALTER TABLE public.artworks DROP CONSTRAINT artworks_verification_status_check;
ALTER TABLE public.artworks ADD CONSTRAINT artworks_verification_status_check CHECK (verification_status = ANY (ARRAY['verified'::text,'pending'::text,'unverified'::text,'declined'::text]));
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS decline_reason text;