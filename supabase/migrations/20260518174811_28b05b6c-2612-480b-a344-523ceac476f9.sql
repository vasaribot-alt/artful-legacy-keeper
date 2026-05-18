
CREATE TABLE public.cr_committee_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'committee_member',
  affiliation TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cr_committee_artist ON public.cr_committee_members(artist_user_id);

ALTER TABLE public.cr_committee_members ENABLE ROW LEVEL SECURITY;

-- Public can view committee members for listed CR profiles
CREATE POLICY "Public can view committee for listed CR profiles"
ON public.cr_committee_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = cr_committee_members.artist_user_id
      AND p.cr_listed = true
  )
);

-- Owner can manage their own committee
CREATE POLICY "Owner can view own committee"
ON public.cr_committee_members FOR SELECT
USING (auth.uid() = artist_user_id);

CREATE POLICY "Owner can insert own committee"
ON public.cr_committee_members FOR INSERT
WITH CHECK (auth.uid() = artist_user_id);

CREATE POLICY "Owner can update own committee"
ON public.cr_committee_members FOR UPDATE
USING (auth.uid() = artist_user_id);

CREATE POLICY "Owner can delete own committee"
ON public.cr_committee_members FOR DELETE
USING (auth.uid() = artist_user_id);

-- Approved registrars (committee) can manage
CREATE POLICY "Registrars can view granted committee"
ON public.cr_committee_members FOR SELECT
USING (public.has_registrar_access(auth.uid(), artist_user_id));

CREATE POLICY "Registrars can insert granted committee"
ON public.cr_committee_members FOR INSERT
WITH CHECK (public.has_registrar_access(auth.uid(), artist_user_id));

CREATE POLICY "Registrars can update granted committee"
ON public.cr_committee_members FOR UPDATE
USING (public.has_registrar_access(auth.uid(), artist_user_id));

CREATE POLICY "Registrars can delete granted committee"
ON public.cr_committee_members FOR DELETE
USING (public.has_registrar_access(auth.uid(), artist_user_id));

CREATE TRIGGER update_cr_committee_members_updated_at
BEFORE UPDATE ON public.cr_committee_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
