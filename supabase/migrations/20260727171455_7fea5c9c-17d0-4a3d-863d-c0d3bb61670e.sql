CREATE TABLE public.global_alliance_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('curator','gallery','museum','university','foundation','corporate_collection','artist_association','other')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  institution TEXT,
  role_title TEXT,
  country TEXT,
  website TEXT,
  linkedin TEXT,
  message TEXT,
  referral_source TEXT,
  consent_contact BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','accepted','declined','archived')),
  internal_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_alliance_members TO authenticated;
GRANT INSERT ON public.global_alliance_members TO anon;
GRANT ALL ON public.global_alliance_members TO service_role;

ALTER TABLE public.global_alliance_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an application"
  ON public.global_alliance_members FOR INSERT
  TO anon, authenticated
  WITH CHECK (consent_contact = true AND status = 'new' AND reviewed_by IS NULL AND reviewed_at IS NULL AND internal_notes IS NULL);

CREATE POLICY "Foundation can view all applications"
  ON public.global_alliance_members FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can update applications"
  ON public.global_alliance_members FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'))
  WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can delete applications"
  ON public.global_alliance_members FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE TRIGGER update_global_alliance_members_updated_at
  BEFORE UPDATE ON public.global_alliance_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_gam_category ON public.global_alliance_members(category);
CREATE INDEX idx_gam_status ON public.global_alliance_members(status);
CREATE INDEX idx_gam_created_at ON public.global_alliance_members(created_at DESC);