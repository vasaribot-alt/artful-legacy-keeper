ALTER TABLE public.registrar_profiles
  ADD COLUMN IF NOT EXISTS available_for_freelance BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability_note TEXT,
  ADD COLUMN IF NOT EXISTS rate_indication TEXT,
  ADD COLUMN IF NOT EXISTS available_for_travel BOOLEAN NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.get_registrar_presentation(uuid);

CREATE FUNCTION public.get_registrar_presentation(_user_id uuid)
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
  nationality text,
  education text,
  work_areas text[],
  cms_experience jsonb,
  cv_file_path text,
  available_for_freelance boolean,
  availability_note text,
  rate_indication text,
  available_for_travel boolean,
  entries jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
    rp.nationality,
    rp.education,
    rp.work_areas,
    rp.cms_experience,
    rp.cv_file_path,
    rp.available_for_freelance,
    rp.availability_note,
    rp.rate_indication,
    rp.available_for_travel,
    COALESCE((
      SELECT jsonb_agg(e ORDER BY e.display_order, e.start_year DESC NULLS LAST)
      FROM (
        SELECT
          re.id,
          re.kind,
          re.title,
          re.organisation,
          re.location,
          re.start_year,
          re.end_year,
          re.is_current,
          re.description,
          re.display_order,
          COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', ri.id,
              'storage_path', ri.storage_path,
              'caption', ri.caption,
              'credit', ri.credit,
              'display_order', ri.display_order
            ) ORDER BY ri.display_order)
            FROM public.registrar_entry_images ri
            WHERE ri.entry_id = re.id
          ), '[]'::jsonb) AS images
        FROM public.registrar_entries re
        WHERE re.user_id = rp.user_id
      ) e
    ), '[]'::jsonb) AS entries
  FROM public.registrar_profiles rp
  JOIN public.profiles p ON p.user_id = rp.user_id
  WHERE rp.user_id = _user_id
    AND rp.is_listed = true
    AND rp.is_verified = true
$$;

GRANT EXECUTE ON FUNCTION public.get_registrar_presentation(uuid) TO anon, authenticated;