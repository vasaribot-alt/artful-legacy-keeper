
-- 1. donors.email exposure — revoke email column from public/anon/authenticated so the
--    "Anyone can view public donors" policy no longer leaks email addresses.
REVOKE SELECT (email) ON public.donors FROM anon, authenticated, public;
-- Foundation role reads donors via the "Foundation can view all donors" policy and
-- doesn't need the column grant either; keep service_role for edge functions.
GRANT SELECT (email) ON public.donors TO service_role;

-- 2. invite_codes UPDATE policy — replace loose USING-only policy with a strict
--    WITH CHECK that only allows an authenticated user to claim an unused code by
--    setting used_by to themselves, and forbids tampering with tier/code/is_active.
DROP POLICY IF EXISTS "Users can mark invite code as used" ON public.invite_codes;

CREATE POLICY "Users can claim an unused invite code"
ON public.invite_codes
FOR UPDATE
TO authenticated
USING (used_by IS NULL)
WITH CHECK (
  used_by = auth.uid()
  AND used_at IS NOT NULL
);

-- Prevent mutating tier / code / is_active / created_by via the claim path.
-- The policy above already forces used_by = auth.uid(), so we additionally lock
-- immutable columns with a trigger that ignores changes for non-foundation users.
CREATE OR REPLACE FUNCTION public.protect_invite_code_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Foundation admins may edit anything through their own policy.
  IF public.has_role(auth.uid(), 'foundation'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- For everyone else, only used_by / used_at may change.
  IF NEW.code IS DISTINCT FROM OLD.code
     OR NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION 'Only used_by / used_at may be modified when claiming an invite code';
  END IF;

  IF OLD.used_by IS NOT NULL THEN
    RAISE EXCEPTION 'This invite code has already been claimed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_invite_code_claim_trg ON public.invite_codes;
CREATE TRIGGER protect_invite_code_claim_trg
BEFORE UPDATE ON public.invite_codes
FOR EACH ROW
EXECUTE FUNCTION public.protect_invite_code_claim();

-- 3. registrar_access INSERT — require caller to actually hold the registrar role
--    so anonymous or non-registrar accounts can't spam access requests to artists.
DROP POLICY IF EXISTS "Registrars can insert access requests" ON public.registrar_access;

CREATE POLICY "Registrars can insert access requests"
ON public.registrar_access
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = registrar_id
  AND requested_by = 'registrar'
  AND public.has_role(auth.uid(), 'registrar'::public.app_role)
  AND status = 'pending'
);
