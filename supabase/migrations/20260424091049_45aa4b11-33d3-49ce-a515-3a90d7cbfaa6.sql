-- Add change tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone DEFAULT now();

-- Trigger: when a registrar edits a profile, mark it pending and stamp updated_by
CREATE OR REPLACE FUNCTION public.track_profile_registrar_edits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  editor uuid := auth.uid();
BEGIN
  -- Owner editing their own profile → auto-verified
  IF editor IS NULL OR editor = NEW.user_id THEN
    NEW.updated_by := editor;
    NEW.verification_status := 'verified';
    NEW.verified_at := now();
    RETURN NEW;
  END IF;

  -- Someone else (registrar) editing → mark pending
  NEW.updated_by := editor;
  NEW.verification_status := 'pending';
  NEW.verified_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_profile_registrar_edits_trigger ON public.profiles;
CREATE TRIGGER track_profile_registrar_edits_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.track_profile_registrar_edits();

-- Allow registrars to update profiles for clients who granted them access
DROP POLICY IF EXISTS "Registrars can update granted profiles" ON public.profiles;
CREATE POLICY "Registrars can update granted profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_registrar_access(auth.uid(), user_id));

-- Allow registrars to view granted profiles (if not already)
DROP POLICY IF EXISTS "Registrars can view granted profiles" ON public.profiles;
CREATE POLICY "Registrars can view granted profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_registrar_access(auth.uid(), user_id));