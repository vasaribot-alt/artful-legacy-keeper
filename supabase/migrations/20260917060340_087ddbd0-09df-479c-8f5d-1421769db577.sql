CREATE OR REPLACE FUNCTION public.activate_estate_succession(
  _successor_id uuid,
  _death_year integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.estate_successors;
  target_user uuid;
  label text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'foundation') THEN
    RAISE EXCEPTION 'Only the foundation can activate an estate succession';
  END IF;

  SELECT * INTO rec
  FROM public.estate_successors
  WHERE id = _successor_id
  FOR UPDATE;

  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Successor entry not found';
  END IF;

  SELECT user_id INTO target_user
  FROM public.profiles
  WHERE lower(trim(email)) = lower(trim(rec.successor_email))
  LIMIT 1;

  IF target_user IS NULL THEN
    UPDATE public.estate_successors
    SET status = 'pending_account',
        activated_at = NULL,
        activated_by = auth.uid(),
        successor_user_id = NULL
    WHERE id = _successor_id;
    RETURN;
  END IF;

  label := coalesce(
    nullif(rec.estate_display_name, ''),
    'Estate of ' || coalesce((SELECT full_name FROM public.profiles WHERE user_id = rec.artist_id), 'the artist')
  );

  INSERT INTO public.registrar_access (owner_id, registrar_id, status, requested_by, message)
  VALUES (rec.artist_id, target_user, 'approved', 'owner', 'Estate succession activated by the foundation')
  ON CONFLICT (owner_id, registrar_id) DO UPDATE
  SET status = 'approved',
      message = EXCLUDED.message;

  UPDATE public.profiles
  SET estate_managed_by = label,
      estate_activated_at = now(),
      is_deceased = CASE WHEN _death_year IS NOT NULL THEN true ELSE is_deceased END,
      death_year = coalesce(_death_year, death_year)
  WHERE user_id = rec.artist_id;

  UPDATE public.estate_successors
  SET status = 'activated',
      activated_at = now(),
      activated_by = auth.uid(),
      successor_user_id = target_user
  WHERE id = _successor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_estate_succession(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.activate_estate_succession(uuid, integer) TO authenticated;