-- Tier enum
DO $$ BEGIN
  CREATE TYPE public.founding_supporter_tier AS ENUM ('bronze','silver','gold','platinum');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.founding_supporter_applicant_type AS ENUM ('individual','foundation','corporation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.founding_supporter_status AS ENUM ('new','contacted','pledged','gifted','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.founding_supporter_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_type public.founding_supporter_applicant_type NOT NULL DEFAULT 'individual',
  contact_name text NOT NULL,
  organization_name text,
  email text NOT NULL,
  phone text,
  country text,
  tier public.founding_supporter_tier NOT NULL DEFAULT 'bronze',
  pledge_amount_eur integer,
  anonymous_public boolean NOT NULL DEFAULT false,
  message text,
  source text,
  status public.founding_supporter_status NOT NULL DEFAULT 'new',
  foundation_notes text,
  followup_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founding_supporter_applications TO authenticated;
GRANT INSERT ON public.founding_supporter_applications TO anon;
GRANT ALL ON public.founding_supporter_applications TO service_role;

ALTER TABLE public.founding_supporter_applications ENABLE ROW LEVEL SECURITY;

-- Public / anonymous can insert their application
CREATE POLICY "Anyone can submit an application"
ON public.founding_supporter_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'new'
  AND foundation_notes IS NULL
  AND followup_at IS NULL
);

-- Only foundation admins can read
CREATE POLICY "Foundation can view all applications"
ON public.founding_supporter_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE POLICY "Foundation can update applications"
ON public.founding_supporter_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'foundation'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE POLICY "Foundation can delete applications"
ON public.founding_supporter_applications
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE TRIGGER trg_fsa_updated_at
BEFORE UPDATE ON public.founding_supporter_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_fsa_status ON public.founding_supporter_applications(status);
CREATE INDEX idx_fsa_created_at ON public.founding_supporter_applications(created_at DESC);
CREATE INDEX idx_fsa_tier ON public.founding_supporter_applications(tier);