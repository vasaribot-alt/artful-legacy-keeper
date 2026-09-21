-- 1. Pin search_path on the remaining mutable function
CREATE OR REPLACE FUNCTION public.guard_statement_signatory()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.full_name ~* '(https?://|www\.|\.com|\.net|\.org|\b(dick|porn|pussy|viagra|casino|crypto|nft)\w*)' THEN
    RAISE EXCEPTION 'invalid signatory name' USING ERRCODE = '22023';
  END IF;
  IF NEW.email ~* '(https?://|www\.)' OR NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid signatory email' USING ERRCODE = '22023';
  END IF;
  IF NEW.comment IS NOT NULL AND NEW.comment ~* '(https?://|www\.)' THEN
    RAISE EXCEPTION 'links are not allowed in comments' USING ERRCODE = '22023';
  END IF;
  IF NEW.organisation IS NOT NULL AND NEW.organisation ~* '(https?://|www\.)' THEN
    RAISE EXCEPTION 'links are not allowed in the organisation field' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Remove committee member emails from direct client reads
REVOKE SELECT ON public.cr_committee_members FROM anon;
REVOKE SELECT ON public.cr_committee_members FROM authenticated;

GRANT SELECT (id, artist_user_id, name, role, affiliation, sort_order, created_at, updated_at)
  ON public.cr_committee_members TO anon;
GRANT SELECT (id, artist_user_id, name, role, affiliation, sort_order, created_at, updated_at)
  ON public.cr_committee_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cr_committee_members TO authenticated;
GRANT ALL ON public.cr_committee_members TO service_role;

-- 3. Owners and granted registrars still need the email for editing
CREATE OR REPLACE FUNCTION public.get_cr_committee(_artist_user_id uuid)
RETURNS TABLE(
  id uuid,
  artist_user_id uuid,
  name text,
  email text,
  role text,
  affiliation text,
  sort_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.id, m.artist_user_id, m.name, m.email, m.role, m.affiliation, m.sort_order
  FROM public.cr_committee_members m
  WHERE m.artist_user_id = _artist_user_id
    AND (
      auth.uid() = m.artist_user_id
      OR public.has_registrar_access(auth.uid(), m.artist_user_id)
    )
  ORDER BY m.sort_order;
$$;

REVOKE ALL ON FUNCTION public.get_cr_committee(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cr_committee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cr_committee(uuid) TO service_role;