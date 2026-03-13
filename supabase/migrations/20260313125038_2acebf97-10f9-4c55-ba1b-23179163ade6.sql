
-- Invite codes table
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  tier founding_artist_tier NOT NULL,
  created_by uuid NOT NULL,
  used_by uuid,
  used_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Founding artists table
CREATE TABLE public.founding_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier founding_artist_tier NOT NULL,
  invite_code_id uuid REFERENCES public.invite_codes(id),
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founding_artists ENABLE ROW LEVEL SECURITY;

-- Invite codes policies
CREATE POLICY "Anyone can validate invite codes" ON public.invite_codes FOR SELECT TO public USING (true);
CREATE POLICY "Foundation can insert invite codes" ON public.invite_codes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'foundation'));
CREATE POLICY "Foundation can update invite codes" ON public.invite_codes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'foundation'));
CREATE POLICY "Foundation can delete invite codes" ON public.invite_codes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'foundation'));

-- Founding artists policies
CREATE POLICY "Anyone can view founding artists" ON public.founding_artists FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert own founding artist record" ON public.founding_artists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Foundation can update founding artists" ON public.founding_artists FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'foundation'));
CREATE POLICY "Foundation can delete founding artists" ON public.founding_artists FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'foundation'));

-- Allow users to mark their invite code as used
CREATE POLICY "Users can mark invite code as used" ON public.invite_codes FOR UPDATE TO authenticated USING (used_by IS NULL OR used_by = auth.uid());

-- Make profiles publicly readable for founding artists page
CREATE POLICY "Anyone can view founding artist profiles" ON public.profiles FOR SELECT TO public USING (
  EXISTS (SELECT 1 FROM public.founding_artists WHERE founding_artists.user_id = profiles.user_id)
);
