-- ===== registrar_profiles =====
CREATE TABLE public.registrar_profiles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  specializations text[] NOT NULL DEFAULT '{}',
  credentials text,
  years_experience integer,
  languages text[] NOT NULL DEFAULT '{}',
  geographic_coverage text,
  professional_statement text,
  is_listed boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  arcs_member boolean NOT NULL DEFAULT false,
  arcs_member_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.registrar_profiles TO authenticated;
GRANT ALL ON public.registrar_profiles TO service_role;

ALTER TABLE public.registrar_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrar can view own profile"
  ON public.registrar_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE POLICY "Registrar can insert own profile"
  ON public.registrar_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Registrar or foundation can update profile"
  ON public.registrar_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'foundation'::public.app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE TRIGGER update_registrar_profiles_updated_at
  BEFORE UPDATE ON public.registrar_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== registrar_applications =====
CREATE TABLE public.registrar_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credentials text,
  experience_summary text,
  years_experience integer,
  specializations text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  geographic_coverage text,
  professional_statement text,
  references_json jsonb NOT NULL DEFAULT '[]',
  arcs_member boolean NOT NULL DEFAULT false,
  arcs_member_id text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.registrar_applications TO authenticated;
GRANT ALL ON public.registrar_applications TO service_role;

ALTER TABLE public.registrar_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrar can view own applications"
  ON public.registrar_applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE POLICY "Registrar can submit application"
  ON public.registrar_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Foundation can review applications"
  ON public.registrar_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE TRIGGER update_registrar_applications_updated_at
  BEFORE UPDATE ON public.registrar_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Approval trigger: sync application data into registrar_profiles =====
CREATE OR REPLACE FUNCTION public.sync_registrar_profile_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.registrar_profiles (
      user_id, specializations, credentials, years_experience,
      languages, geographic_coverage, professional_statement,
      arcs_member, arcs_member_id,
      is_verified, is_listed, verified_at, verified_by
    ) VALUES (
      NEW.user_id, NEW.specializations, NEW.credentials, NEW.years_experience,
      NEW.languages, NEW.geographic_coverage, NEW.professional_statement,
      NEW.arcs_member, NEW.arcs_member_id,
      true, true, now(), NEW.reviewed_by
    )
    ON CONFLICT (user_id) DO UPDATE SET
      specializations = EXCLUDED.specializations,
      credentials = EXCLUDED.credentials,
      years_experience = EXCLUDED.years_experience,
      languages = EXCLUDED.languages,
      geographic_coverage = EXCLUDED.geographic_coverage,
      professional_statement = EXCLUDED.professional_statement,
      arcs_member = EXCLUDED.arcs_member,
      arcs_member_id = EXCLUDED.arcs_member_id,
      is_verified = true,
      is_listed = true,
      verified_at = now(),
      verified_by = NEW.reviewed_by,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_registrar_profile_on_approval
  AFTER UPDATE OF status ON public.registrar_applications
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.sync_registrar_profile_on_approval();

-- ===== Public directory function =====
CREATE OR REPLACE FUNCTION public.get_verified_registrars()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  city text,
  country text,
  specializations text[],
  languages text[],
  geographic_coverage text,
  professional_statement text,
  years_experience integer,
  arcs_member boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    rp.user_id,
    p.full_name,
    p.avatar_url,
    p.city,
    p.country,
    rp.specializations,
    rp.languages,
    rp.geographic_coverage,
    rp.professional_statement,
    rp.years_experience,
    rp.arcs_member
  FROM public.registrar_profiles rp
  JOIN public.profiles p ON p.user_id = rp.user_id
  WHERE rp.is_listed = true AND rp.is_verified = true
  ORDER BY p.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_verified_registrars() TO anon, authenticated;