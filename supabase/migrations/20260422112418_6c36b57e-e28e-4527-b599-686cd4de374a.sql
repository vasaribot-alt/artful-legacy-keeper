CREATE OR REPLACE FUNCTION public.get_registrar_access_details(_owner_id uuid)
RETURNS TABLE(
  access_id uuid,
  registrar_id uuid,
  status text,
  granted_at timestamptz,
  registrar_name text,
  registrar_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ra.id AS access_id,
    ra.registrar_id,
    ra.status,
    ra.granted_at,
    p.full_name AS registrar_name,
    p.email AS registrar_email
  FROM public.registrar_access ra
  LEFT JOIN public.profiles p
    ON p.user_id = ra.registrar_id
  WHERE ra.owner_id = _owner_id
    AND auth.uid() = _owner_id;
$$;