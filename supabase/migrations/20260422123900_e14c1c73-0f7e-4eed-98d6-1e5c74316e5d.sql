ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contact_visibility jsonb NOT NULL DEFAULT '{"studio_address": true, "phone": true, "email": true, "website": true}'::jsonb;