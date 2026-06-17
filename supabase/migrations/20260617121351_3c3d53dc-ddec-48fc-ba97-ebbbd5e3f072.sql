-- 1. Extend tier enum
ALTER TYPE public.founding_artist_tier ADD VALUE IF NOT EXISTS 'peer';

-- 2. Peer invites table
CREATE TABLE public.peer_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_name text NOT NULL,
  invitee_email text,
  personal_message text,
  invite_code_id uuid REFERENCES public.invite_codes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'sent', -- sent | redeemed | revoked
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.peer_invites TO authenticated;
GRANT ALL ON public.peer_invites TO service_role;

ALTER TABLE public.peer_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviter can view own peer invites"
  ON public.peer_invites FOR SELECT TO authenticated
  USING (inviter_id = auth.uid() OR public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE POLICY "Foundation can manage peer invites"
  ON public.peer_invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE INDEX peer_invites_inviter_idx ON public.peer_invites(inviter_id);

CREATE TRIGGER peer_invites_set_updated_at
  BEFORE UPDATE ON public.peer_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Function: create_peer_invite (SECURITY DEFINER bypasses invite_codes Foundation-only insert)
CREATE OR REPLACE FUNCTION public.create_peer_invite(
  _invitee_name text,
  _invitee_email text DEFAULT NULL,
  _personal_message text DEFAULT NULL
) RETURNS TABLE(invite_id uuid, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  verified boolean;
  active_count int;
  new_code text;
  new_code_id uuid;
  new_invite_id uuid;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _invitee_name IS NULL OR length(trim(_invitee_name)) = 0 THEN
    RAISE EXCEPTION 'Invitee name is required';
  END IF;

  SELECT id_verified INTO verified FROM public.profiles WHERE user_id = caller;
  IF NOT COALESCE(verified, false) THEN
    RAISE EXCEPTION 'Only ID-verified artists can send peer invites';
  END IF;

  SELECT count(*) INTO active_count
  FROM public.peer_invites
  WHERE inviter_id = caller AND status IN ('sent','redeemed');

  IF active_count >= 5 THEN
    RAISE EXCEPTION 'You have reached the 5-invite limit';
  END IF;

  -- Generate unique 8-char code
  LOOP
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    BEGIN
      INSERT INTO public.invite_codes(code, tier, created_by, is_active)
      VALUES (new_code, 'peer'::public.founding_artist_tier, caller, true)
      RETURNING id INTO new_code_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- try again
    END;
  END LOOP;

  INSERT INTO public.peer_invites(inviter_id, invitee_name, invitee_email, personal_message, invite_code_id)
  VALUES (caller, trim(_invitee_name), nullif(trim(_invitee_email),''), nullif(trim(_personal_message),''), new_code_id)
  RETURNING id INTO new_invite_id;

  RETURN QUERY SELECT new_invite_id, new_code;
END
$$;

GRANT EXECUTE ON FUNCTION public.create_peer_invite(text, text, text) TO authenticated;

-- 4. Function: revoke_peer_invite
CREATE OR REPLACE FUNCTION public.revoke_peer_invite(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  code_id uuid;
  is_used boolean;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT pi.invite_code_id, (ic.used_by IS NOT NULL)
    INTO code_id, is_used
  FROM public.peer_invites pi
  JOIN public.invite_codes ic ON ic.id = pi.invite_code_id
  WHERE pi.id = _invite_id AND pi.inviter_id = caller;

  IF code_id IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF is_used THEN RAISE EXCEPTION 'Invite already redeemed'; END IF;

  UPDATE public.invite_codes SET is_active = false WHERE id = code_id;
  UPDATE public.peer_invites SET status = 'revoked' WHERE id = _invite_id;
END
$$;

GRANT EXECUTE ON FUNCTION public.revoke_peer_invite(uuid) TO authenticated;