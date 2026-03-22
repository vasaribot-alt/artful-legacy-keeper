
CREATE POLICY "Authenticated users can update own invite status"
  ON public.artist_invites FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invite_codes ic
      WHERE ic.id = artist_invites.invite_code_id
        AND ic.used_by = auth.uid()
    )
  );
