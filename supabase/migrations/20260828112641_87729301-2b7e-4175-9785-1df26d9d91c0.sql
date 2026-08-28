ALTER TABLE public.gallery_artist_representations
  ALTER COLUMN artist_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS invited_name text,
  ADD COLUMN IF NOT EXISTS invited_email text;

ALTER TABLE public.gallery_artist_representations
  DROP CONSTRAINT IF EXISTS gallery_artist_representations_status_check;

ALTER TABLE public.gallery_artist_representations
  ADD CONSTRAINT gallery_artist_representations_status_check
  CHECK (status = ANY (ARRAY['invited'::text, 'pending'::text, 'approved'::text, 'declined'::text, 'ended'::text]));

ALTER TABLE public.gallery_artist_representations
  ADD CONSTRAINT gallery_artist_representations_identity_check
  CHECK (artist_id IS NOT NULL OR invited_email IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS gallery_artist_representations_gallery_invited_email_key
  ON public.gallery_artist_representations (gallery_id, lower(trim(invited_email)))
  WHERE artist_id IS NULL;

CREATE OR REPLACE FUNCTION public.get_gallery_roster(_gallery_id uuid)
RETURNS TABLE(
  id uuid,
  gallery_id uuid,
  artist_id uuid,
  status text,
  notes text,
  artist_name text,
  artist_email text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.gallery_id, r.artist_id, r.status, r.notes,
         COALESCE(p.full_name, r.invited_name),
         COALESCE(p.email, r.invited_email),
         r.created_at
  FROM public.gallery_artist_representations r
  JOIN public.gallery_accounts g ON g.id = r.gallery_id
  LEFT JOIN public.profiles p ON p.user_id = r.artist_id
  WHERE r.gallery_id = _gallery_id
    AND g.owner_id = auth.uid()
  ORDER BY r.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_gallery_roster(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_gallery_roster(uuid) TO authenticated;

-- Link invited artists to their account once they register with the same email
CREATE OR REPLACE FUNCTION public.link_gallery_invites_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.gallery_artist_representations r
    SET artist_id = NEW.user_id,
        status = CASE WHEN r.status = 'invited' THEN 'pending' ELSE r.status END,
        updated_at = now()
    WHERE r.artist_id IS NULL
      AND lower(trim(r.invited_email)) = lower(trim(NEW.email))
      AND NOT EXISTS (
        SELECT 1 FROM public.gallery_artist_representations r2
        WHERE r2.gallery_id = r.gallery_id AND r2.artist_id = NEW.user_id
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_gallery_invites_on_profile_ins ON public.profiles;
CREATE TRIGGER link_gallery_invites_on_profile_ins
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.link_gallery_invites_on_profile();