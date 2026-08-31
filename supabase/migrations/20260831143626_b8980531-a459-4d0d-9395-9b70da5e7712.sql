CREATE TABLE public.invitation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  country text,
  city text,
  website text,
  birth_year integer,
  practice_summary text,
  cv_url text,
  referred_by text,
  applicant_role text NOT NULL DEFAULT 'artist',
  message text,
  source text,
  status text NOT NULL DEFAULT 'new',
  foundation_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  invite_code_id uuid REFERENCES public.invite_codes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitation_requests TO authenticated;
GRANT ALL ON public.invitation_requests TO service_role;

ALTER TABLE public.invitation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foundation can view invitation requests"
ON public.invitation_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE POLICY "Foundation can update invitation requests"
ON public.invitation_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'foundation'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE POLICY "Foundation can delete invitation requests"
ON public.invitation_requests FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE TRIGGER update_invitation_requests_updated_at
BEFORE UPDATE ON public.invitation_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX invitation_requests_status_idx ON public.invitation_requests (status, created_at DESC);