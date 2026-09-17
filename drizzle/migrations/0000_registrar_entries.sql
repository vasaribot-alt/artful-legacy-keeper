CREATE TABLE public.registrar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'position',
  title text,
  organisation text,
  location text,
  start_year integer,
  end_year integer,
  is_current boolean NOT NULL DEFAULT false,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrar_entries TO authenticated;
GRANT SELECT ON public.registrar_entries TO anon;
GRANT ALL ON public.registrar_entries TO service_role;

ALTER TABLE public.registrar_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrars manage own entries"
ON public.registrar_entries FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Foundation reads all registrar entries"
ON public.registrar_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Listed verified registrar entries are public"
ON public.registrar_entries FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.registrar_profiles rp
  WHERE rp.user_id = registrar_entries.user_id
    AND rp.is_listed = true AND rp.is_verified = true
));

CREATE INDEX registrar_entries_user_idx ON public.registrar_entries (user_id, kind, display_order);

CREATE TRIGGER registrar_entries_updated_at
BEFORE UPDATE ON public.registrar_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.registrar_entry_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.registrar_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  caption text,
  credit text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrar_entry_images TO authenticated;
GRANT SELECT ON public.registrar_entry_images TO anon;
GRANT ALL ON public.registrar_entry_images TO service_role;

ALTER TABLE public.registrar_entry_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrars manage own entry images"
ON public.registrar_entry_images FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Listed verified registrar entry images are public"
ON public.registrar_entry_images FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.registrar_profiles rp
  WHERE rp.user_id = registrar_entry_images.user_id
    AND rp.is_listed = true AND rp.is_verified = true
));

CREATE INDEX registrar_entry_images_entry_idx ON public.registrar_entry_images (entry_id, display_order);

CREATE OR REPLACE FUNCTION public.get_registrar_presentation(_user_id uuid)
RETURNS TABLE(
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
    COALESCE(rp.specializations, '{}'),
    COALESCE(rp.languages, '{}'),
    rp.geographic_coverage,
    rp.professional_statement,
    rp.credentials,
    rp.years_experience,
    COALESCE(rp.arcs_member, false),
    rp.arcs_member_id,
    rp.nationality,
    rp.education,
    COALESCE(rp.work_areas, '{}'),
    rp.cms_experience,
    rp.cv_file_path,
    COALESCE((
      SELECT jsonb_agg(e ORDER BY e.display_order, e.start_year DESC NULLS LAST)
      FROM (
        SELECT re.id, re.kind, re.title, re.organisation, re.location,
               re.start_year, re.end_year, re.is_current, re.description,
               re.display_order,
               COALESCE((
                 SELECT jsonb_agg(jsonb_build_object(
                          'id', ri.id,
                          'storage_path', ri.storage_path,
                          'caption', ri.caption,
                          'credit', ri.credit)
                        ORDER BY ri.display_order)
                 FROM public.registrar_entry_images ri
                 WHERE ri.entry_id = re.id
               ), '[]'::jsonb) AS images
        FROM public.registrar_entries re
        WHERE re.user_id = rp.user_id
      ) e
    ), '[]'::jsonb)
  FROM public.registrar_profiles rp
  JOIN public.profiles p ON p.user_id = rp.user_id
  WHERE rp.user_id = _user_id
    AND rp.is_listed = true
    AND rp.is_verified = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_registrar_presentation(uuid) TO anon, authenticated;