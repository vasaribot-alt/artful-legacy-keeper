CREATE OR REPLACE FUNCTION public.sync_peer_invite_on_code_use()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.used_by IS NOT NULL AND (OLD.used_by IS NULL) THEN
    UPDATE public.peer_invites
       SET status = 'redeemed', redeemed_at = COALESCE(NEW.used_at, now())
     WHERE invite_code_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_peer_invite_on_code_use ON public.invite_codes;
CREATE TRIGGER trg_sync_peer_invite_on_code_use
AFTER UPDATE ON public.invite_codes
FOR EACH ROW EXECUTE FUNCTION public.sync_peer_invite_on_code_use();