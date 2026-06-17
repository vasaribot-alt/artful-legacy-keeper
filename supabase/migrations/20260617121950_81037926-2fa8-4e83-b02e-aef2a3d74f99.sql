-- 1. Bonus invites column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bonus_invites integer NOT NULL DEFAULT 0;

-- 2. Update create_peer_invite to honor bonus quota
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
  bonus int;
  active_count int;
  max_allowed int;
  new_code text;
  new_code_id uuid;
  new_invite_id uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _invitee_name IS NULL OR length(trim(_invitee_name)) = 0 THEN
    RAISE EXCEPTION 'Invitee name is required';
  END IF;

  SELECT id_verified, COALESCE(bonus_invites,0)
    INTO verified, bonus
  FROM public.profiles WHERE user_id = caller;

  IF NOT COALESCE(verified, false) THEN
    RAISE EXCEPTION 'Only ID-verified artists can send peer invites';
  END IF;

  max_allowed := 5 + COALESCE(bonus, 0);

  SELECT count(*) INTO active_count
  FROM public.peer_invites
  WHERE inviter_id = caller AND status IN ('sent','redeemed');

  IF active_count >= max_allowed THEN
    RAISE EXCEPTION 'You have reached your invite limit (%).', max_allowed;
  END IF;

  LOOP
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    BEGIN
      INSERT INTO public.invite_codes(code, tier, created_by, is_active)
      VALUES (new_code, 'peer'::public.founding_artist_tier, caller, true)
      RETURNING id INTO new_code_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN END;
  END LOOP;

  INSERT INTO public.peer_invites(inviter_id, invitee_name, invitee_email, personal_message, invite_code_id)
  VALUES (caller, trim(_invitee_name), nullif(trim(_invitee_email),''), nullif(trim(_personal_message),''), new_code_id)
  RETURNING id INTO new_invite_id;

  RETURN QUERY SELECT new_invite_id, new_code;
END $$;

-- 3. Trigger: when an invited artist becomes id_verified, reward the inviter
CREATE OR REPLACE FUNCTION public.award_referral_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inviter uuid;
BEGIN
  IF NEW.id_verified = true AND COALESCE(OLD.id_verified, false) = false THEN
    -- Find the inviter via the peer_invites → invite_codes link
    SELECT pi.inviter_id
      INTO inviter
    FROM public.peer_invites pi
    JOIN public.invite_codes ic ON ic.id = pi.invite_code_id
    WHERE ic.used_by = NEW.user_id
    LIMIT 1;

    IF inviter IS NOT NULL AND inviter <> NEW.user_id THEN
      UPDATE public.profiles
         SET bonus_invites = COALESCE(bonus_invites, 0) + 1
       WHERE user_id = inviter;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_award_referral_bonus ON public.profiles;
CREATE TRIGGER trg_award_referral_bonus
AFTER UPDATE OF id_verified ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.award_referral_bonus();