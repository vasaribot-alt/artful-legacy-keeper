CREATE OR REPLACE FUNCTION public.find_artist_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.user_id
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND public.has_gallery_workspace_access(auth.uid())
    AND lower(trim(p.email)) = lower(trim(_email))
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = p.user_id
        AND ur.role = 'artist'::public.app_role
    )
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.find_artist_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_artist_by_email(text) TO authenticated;