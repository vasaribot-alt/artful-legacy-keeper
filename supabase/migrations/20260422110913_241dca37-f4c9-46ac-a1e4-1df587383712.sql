-- Allow artwork owners to see basic profile info of registrars who have access to them
CREATE OR REPLACE FUNCTION public.get_registrar_profiles(_owner_id uuid)
RETURNS TABLE(user_id uuid, full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.email
  FROM public.profiles p
  WHERE auth.uid() = _owner_id
    AND p.user_id IN (
      SELECT ra.registrar_id
      FROM public.registrar_access ra
      WHERE ra.owner_id = _owner_id
    );
$$;