CREATE TABLE IF NOT EXISTS public.major_gift_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organisation TEXT,
  country TEXT,
  estimated_amount_eur INTEGER,
  intended_frequency TEXT,
  message TEXT,
  preferred_contact TEXT,
  source TEXT DEFAULT 'support_page',
  status TEXT NOT NULL DEFAULT 'new',
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.major_gift_inquiries TO authenticated;
GRANT ALL ON public.major_gift_inquiries TO service_role;

ALTER TABLE public.major_gift_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foundation admins read inquiries"
  ON public.major_gift_inquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation admins update inquiries"
  ON public.major_gift_inquiries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'))
  WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE INDEX IF NOT EXISTS major_gift_inquiries_status_idx
  ON public.major_gift_inquiries (status, created_at DESC);

CREATE TRIGGER update_major_gift_inquiries_updated_at
  BEFORE UPDATE ON public.major_gift_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();