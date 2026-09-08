ALTER TABLE public.registrar_applications
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS cv_file_path text,
  ADD COLUMN IF NOT EXISTS cms_experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_areas text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.registrar_profiles
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS cv_file_path text,
  ADD COLUMN IF NOT EXISTS cms_experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_areas text[] NOT NULL DEFAULT '{}'::text[];

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
      nationality, education, cv_file_path, cms_experience, work_areas,
      is_verified, is_listed, verified_at, verified_by
    ) VALUES (
      NEW.user_id, NEW.specializations, NEW.credentials, NEW.years_experience,
      NEW.languages, NEW.geographic_coverage, NEW.professional_statement,
      NEW.arcs_member, NEW.arcs_member_id,
      NEW.nationality, NEW.education, NEW.cv_file_path,
      COALESCE(NEW.cms_experience, '[]'::jsonb), COALESCE(NEW.work_areas, '{}'::text[]),
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
      nationality = EXCLUDED.nationality,
      education = EXCLUDED.education,
      cv_file_path = EXCLUDED.cv_file_path,
      cms_experience = EXCLUDED.cms_experience,
      work_areas = EXCLUDED.work_areas,
      is_verified = true,
      is_listed = true,
      verified_at = now(),
      verified_by = NEW.reviewed_by,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.get_verified_registrars();

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
  credentials text,
  years_experience integer,
  arcs_member boolean,
  arcs_member_id text,
  education text,
  work_areas text[],
  cms_systems text[]
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
    rp.credentials,
    rp.years_experience,
    rp.arcs_member,
    rp.arcs_member_id,
    rp.education,
    rp.work_areas,
    COALESCE(
      ARRAY(
        SELECT DISTINCT elem->>'system'
        FROM jsonb_array_elements(COALESCE(rp.cms_experience, '[]'::jsonb)) AS elem
        WHERE COALESCE(elem->>'system', '') <> ''
      ),
      '{}'::text[]
    ) AS cms_systems
  FROM public.registrar_profiles rp
  JOIN public.profiles p ON p.user_id = rp.user_id
  WHERE rp.is_listed = true AND rp.is_verified = true
  ORDER BY p.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_verified_registrars() TO anon, authenticated;

CREATE POLICY "Registrars upload own CV"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'registrar-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Registrars update own CV"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'registrar-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Registrars delete own CV"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'registrar-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Registrars and foundation read CVs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'registrar-cvs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'foundation')
    )
  );