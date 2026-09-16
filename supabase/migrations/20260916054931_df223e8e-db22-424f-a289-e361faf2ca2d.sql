CREATE TABLE public.estate_successors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  successor_user_id uuid,
  successor_name text NOT NULL,
  successor_email text NOT NULL,
  relationship text,
  notes text,
  estate_display_name text,
  status text NOT NULL DEFAULT 'named',
  proof_document_path text,
  named_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  activated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX estate_successors_artist_idx ON public.estate_successors(artist_id);
CREATE INDEX estate_successors_email_idx ON public.estate_successors(lower(successor_email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estate_successors TO authenticated;
GRANT ALL ON public.estate_successors TO service_role;

ALTER TABLE public.estate_successors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists manage their own successors"
  ON public.estate_successors FOR ALL TO authenticated
  USING (artist_id = auth.uid())
  WITH CHECK (artist_id = auth.uid());

CREATE POLICY "Successors can view entries naming them"
  ON public.estate_successors FOR SELECT TO authenticated
  USING (
    successor_user_id = auth.uid()
    OR lower(successor_email) = lower(coalesce((SELECT email FROM public.profiles WHERE user_id = auth.uid()), ''))
  );

CREATE POLICY "Foundation can view all successors"
  ON public.estate_successors FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can update all successors"
  ON public.estate_successors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'))
  WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE TRIGGER estate_successors_updated_at
  BEFORE UPDATE ON public.estate_successors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS estate_managed_by text,
  ADD COLUMN IF NOT EXISTS estate_activated_at timestamptz;

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

  SELECT * INTO rec FROM public.estate_successors WHERE id = _successor_id;
  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Successor entry not found';
  END IF;

  SELECT user_id INTO target_user
  FROM public.profiles
  WHERE lower(email) = lower(rec.successor_email)
  LIMIT 1;

  label := coalesce(
    nullif(rec.estate_display_name, ''),
    'Estate of ' || coalesce((SELECT full_name FROM public.profiles WHERE user_id = rec.artist_id), 'the artist')
  );

  UPDATE public.profiles
  SET estate_managed_by = label,
      estate_activated_at = now(),
      is_deceased = CASE WHEN _death_year IS NOT NULL THEN true ELSE is_deceased END,
      death_year = coalesce(_death_year, death_year)
  WHERE user_id = rec.artist_id;

  IF target_user IS NOT NULL THEN
    INSERT INTO public.registrar_access (owner_id, registrar_id, status, requested_by, message)
    VALUES (rec.artist_id, target_user, 'approved', 'owner', 'Estate succession activated by the foundation')
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.estate_successors
  SET status = 'activated',
      activated_at = now(),
      activated_by = auth.uid(),
      successor_user_id = coalesce(target_user, successor_user_id)
  WHERE id = _successor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_estate_succession(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.activate_estate_succession(uuid, integer) TO authenticated;