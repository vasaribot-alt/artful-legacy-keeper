DROP POLICY IF EXISTS "Users can insert own founding artist record" ON public.founding_artists;
CREATE POLICY "Users can insert own founding artist record"
ON public.founding_artists
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND invite_code_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.invite_codes ic
    WHERE ic.id = invite_code_id
      AND ic.used_by = auth.uid()
      AND ic.used_at IS NOT NULL
      AND ic.is_active = true
      AND ic.tier = founding_artists.tier
  )
);

DROP TRIGGER IF EXISTS protect_invite_code_claim_trigger ON public.invite_codes;
CREATE TRIGGER protect_invite_code_claim_trigger
BEFORE UPDATE ON public.invite_codes
FOR EACH ROW
EXECUTE FUNCTION public.protect_invite_code_claim();