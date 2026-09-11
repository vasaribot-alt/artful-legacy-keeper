-- 1. Committee voting eligibility helper
CREATE OR REPLACE FUNCTION public.is_cr_committee_voter(_user_id uuid, _artist_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
     AND _artist_owner_id IS NOT NULL
     AND _user_id <> _artist_owner_id
     AND (
       public.has_registrar_access(_user_id, _artist_owner_id)
       OR EXISTS (
         SELECT 1
         FROM public.cr_committee_members m
         JOIN auth.users u ON lower(u.email) = lower(m.email)
         WHERE m.artist_user_id = _artist_owner_id
           AND u.id = _user_id
       )
     )
$$;

DROP POLICY IF EXISTS "Cast own vote" ON public.cr_committee_votes;
CREATE POLICY "Committee members can cast own vote"
ON public.cr_committee_votes
FOR INSERT
TO authenticated
WITH CHECK (
  voter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.cr_submissions s
    WHERE s.id = cr_committee_votes.submission_id
      AND public.is_cr_committee_voter(auth.uid(), s.artist_owner_id)
  )
);

DROP POLICY IF EXISTS "Update own vote" ON public.cr_committee_votes;
CREATE POLICY "Committee members can update own vote"
ON public.cr_committee_votes
FOR UPDATE
TO authenticated
USING (
  voter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.cr_submissions s
    WHERE s.id = cr_committee_votes.submission_id
      AND public.is_cr_committee_voter(auth.uid(), s.artist_owner_id)
  )
)
WITH CHECK (
  voter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.cr_submissions s
    WHERE s.id = cr_committee_votes.submission_id
      AND public.is_cr_committee_voter(auth.uid(), s.artist_owner_id)
  )
);

-- 2. Owners may edit descriptive fields only, never decision fields
DROP POLICY IF EXISTS "Owner can manage own submissions" ON public.cr_submissions;

CREATE POLICY "Owner can update own submissions"
ON public.cr_submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = artist_owner_id)
WITH CHECK (auth.uid() = artist_owner_id);

CREATE POLICY "Owner can delete own submissions"
ON public.cr_submissions
FOR DELETE
TO authenticated
USING (auth.uid() = artist_owner_id);

CREATE OR REPLACE FUNCTION public.guard_cr_submission_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Registrars with access (and server-side/service role calls) may set decisions.
  IF auth.uid() IS NULL OR public.has_registrar_access(auth.uid(), NEW.artist_owner_id) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = NEW.artist_owner_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
       OR NEW.rejection_notes IS DISTINCT FROM OLD.rejection_notes
       OR NEW.decision_at IS DISTINCT FROM OLD.decision_at
       OR NEW.decision_by IS DISTINCT FROM OLD.decision_by
       OR NEW.resulting_artwork_id IS DISTINCT FROM OLD.resulting_artwork_id
       OR NEW.cr_number IS DISTINCT FROM OLD.cr_number
       OR NEW.artist_owner_id IS DISTINCT FROM OLD.artist_owner_id THEN
      RAISE EXCEPTION 'Submission decisions can only be recorded by the review committee';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_cr_submission_decision ON public.cr_submissions;
CREATE TRIGGER guard_cr_submission_decision
BEFORE UPDATE ON public.cr_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_cr_submission_decision();