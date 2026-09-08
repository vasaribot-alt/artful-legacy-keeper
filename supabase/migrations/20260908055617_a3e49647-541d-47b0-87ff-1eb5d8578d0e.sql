DROP POLICY IF EXISTS "Users can claim an unused invite code" ON public.invite_codes;

CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text)
RETURNS TABLE (
  invite_code_id uuid,
  tier public.founding_artist_tier
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _invite public.invite_codes%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _invite
  FROM public.invite_codes
  WHERE code = upper(trim(_code))
    AND is_active = true
    AND used_by IS NULL
  FOR UPDATE;

  IF _invite.id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.founding_artists fa WHERE fa.user_id = _user_id) THEN
    RETURN;
  END IF;

  UPDATE public.invite_codes
  SET used_by = _user_id, used_at = now()
  WHERE id = _invite.id;

  INSERT INTO public.founding_artists (user_id, tier, invite_code_id)
  VALUES (_user_id, _invite.tier, _invite.id);

  UPDATE public.artist_invites
  SET status = 'registered'
  WHERE invite_code_id = _invite.id;

  RETURN QUERY SELECT _invite.id, _invite.tier;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(text) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view galleries" ON public.galleries;
CREATE POLICY "Foundation staff can view galleries"
ON public.galleries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'foundation'));

CREATE OR REPLACE FUNCTION public.search_galleries(_query text)
RETURNS TABLE (
  id uuid,
  name text,
  country text,
  city text,
  established_year integer,
  website text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name, g.country, g.city, g.established_year, g.website
  FROM public.galleries g
  WHERE length(trim(_query)) >= 2
    AND g.name ILIKE '%' || trim(_query) || '%'
  ORDER BY g.name
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.search_galleries(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_galleries(text) TO authenticated;