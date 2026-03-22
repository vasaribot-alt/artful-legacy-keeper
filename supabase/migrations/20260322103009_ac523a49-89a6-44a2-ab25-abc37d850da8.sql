
-- Create donor_tier enum
CREATE TYPE public.donor_tier AS ENUM ('platinum', 'gold', 'silver', 'bronze');

-- Create donors table
CREATE TABLE public.donors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  tier donor_tier NOT NULL DEFAULT 'bronze',
  message text,
  is_public boolean NOT NULL DEFAULT true,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

-- Anyone can view public donors
CREATE POLICY "Anyone can view public donors"
  ON public.donors FOR SELECT TO public
  USING (is_public = true);

-- Foundation can manage donors
CREATE POLICY "Foundation can insert donors"
  ON public.donors FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'foundation'::app_role));

CREATE POLICY "Foundation can update donors"
  ON public.donors FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'foundation'::app_role));

CREATE POLICY "Foundation can delete donors"
  ON public.donors FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'foundation'::app_role));

-- Foundation can also see non-public donors
CREATE POLICY "Foundation can view all donors"
  ON public.donors FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'foundation'::app_role));
