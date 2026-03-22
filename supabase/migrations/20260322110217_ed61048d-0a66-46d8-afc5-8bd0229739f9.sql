
CREATE TABLE public.artist_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_name text NOT NULL,
  birth_year integer NULL,
  city text NULL,
  country text NULL,
  email text NULL,
  tier public.founding_artist_tier NOT NULL DEFAULT 'emerging',
  notes text NULL,
  invite_code_id uuid REFERENCES public.invite_codes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'invited',
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foundation can view artist invites"
  ON public.artist_invites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can insert artist invites"
  ON public.artist_invites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can update artist invites"
  ON public.artist_invites FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can delete artist invites"
  ON public.artist_invites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));
