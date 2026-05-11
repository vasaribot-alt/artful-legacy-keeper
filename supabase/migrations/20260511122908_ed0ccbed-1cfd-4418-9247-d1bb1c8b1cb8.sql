
-- Add committee quorum to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS committee_quorum integer NOT NULL DEFAULT 2;

-- ============ cr_submissions ============
CREATE TABLE public.cr_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_owner_id uuid NOT NULL,
  submitted_by uuid,
  submitter_name text,
  submitter_email text,
  title text NOT NULL,
  year_estimated text,
  medium text,
  height numeric,
  width numeric,
  depth numeric,
  provenance text,
  condition_notes text,
  owner_contact text,
  status text NOT NULL DEFAULT 'submitted',
  rejection_reason text,
  rejection_notes text,
  decision_at timestamptz,
  decision_by uuid,
  resulting_artwork_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cr_submissions_status_chk CHECK (status IN ('submitted','under_review','accepted','rejected','deferred'))
);
CREATE INDEX idx_cr_submissions_owner ON public.cr_submissions(artist_owner_id);
CREATE INDEX idx_cr_submissions_status ON public.cr_submissions(status);

ALTER TABLE public.cr_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own submissions"
  ON public.cr_submissions FOR SELECT TO authenticated
  USING (auth.uid() = artist_owner_id);
CREATE POLICY "Owner can manage own submissions"
  ON public.cr_submissions FOR ALL TO authenticated
  USING (auth.uid() = artist_owner_id)
  WITH CHECK (auth.uid() = artist_owner_id);

CREATE POLICY "Committee can view granted submissions"
  ON public.cr_submissions FOR SELECT TO authenticated
  USING (public.has_registrar_access(auth.uid(), artist_owner_id));
CREATE POLICY "Committee can insert granted submissions"
  ON public.cr_submissions FOR INSERT TO authenticated
  WITH CHECK (public.has_registrar_access(auth.uid(), artist_owner_id));
CREATE POLICY "Committee can update granted submissions"
  ON public.cr_submissions FOR UPDATE TO authenticated
  USING (public.has_registrar_access(auth.uid(), artist_owner_id));
CREATE POLICY "Committee can delete granted submissions"
  ON public.cr_submissions FOR DELETE TO authenticated
  USING (public.has_registrar_access(auth.uid(), artist_owner_id));

CREATE TRIGGER update_cr_submissions_updated_at
  BEFORE UPDATE ON public.cr_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ cr_submission_images ============
CREATE TABLE public.cr_submission_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.cr_submissions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cr_submission_images_submission ON public.cr_submission_images(submission_id);

ALTER TABLE public.cr_submission_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View submission images"
  ON public.cr_submission_images FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cr_submissions s WHERE s.id = submission_id
    AND (s.artist_owner_id = auth.uid() OR public.has_registrar_access(auth.uid(), s.artist_owner_id))));
CREATE POLICY "Insert submission images"
  ON public.cr_submission_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cr_submissions s WHERE s.id = submission_id
    AND (s.artist_owner_id = auth.uid() OR public.has_registrar_access(auth.uid(), s.artist_owner_id))));
CREATE POLICY "Delete submission images"
  ON public.cr_submission_images FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cr_submissions s WHERE s.id = submission_id
    AND (s.artist_owner_id = auth.uid() OR public.has_registrar_access(auth.uid(), s.artist_owner_id))));

-- ============ cr_committee_votes ============
CREATE TABLE public.cr_committee_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.cr_submissions(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL,
  vote text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, voter_id),
  CONSTRAINT cr_votes_vote_chk CHECK (vote IN ('accept','reject','defer','abstain'))
);
CREATE INDEX idx_cr_votes_submission ON public.cr_committee_votes(submission_id);

ALTER TABLE public.cr_committee_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View votes on accessible submissions"
  ON public.cr_committee_votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cr_submissions s WHERE s.id = submission_id
    AND (s.artist_owner_id = auth.uid() OR public.has_registrar_access(auth.uid(), s.artist_owner_id))));
CREATE POLICY "Cast own vote"
  ON public.cr_committee_votes FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid() AND EXISTS (SELECT 1 FROM public.cr_submissions s WHERE s.id = submission_id
    AND (s.artist_owner_id = auth.uid() OR public.has_registrar_access(auth.uid(), s.artist_owner_id))));
CREATE POLICY "Update own vote"
  ON public.cr_committee_votes FOR UPDATE TO authenticated
  USING (voter_id = auth.uid());
CREATE POLICY "Delete own vote"
  ON public.cr_committee_votes FOR DELETE TO authenticated
  USING (voter_id = auth.uid());

CREATE TRIGGER update_cr_votes_updated_at
  BEFORE UPDATE ON public.cr_committee_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ cr_audit_log (append-only) ============
CREATE TABLE public.cr_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.cr_submissions(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cr_audit_submission ON public.cr_audit_log(submission_id, created_at DESC);

ALTER TABLE public.cr_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View audit log on accessible submissions"
  ON public.cr_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cr_submissions s WHERE s.id = submission_id
    AND (s.artist_owner_id = auth.uid() OR public.has_registrar_access(auth.uid(), s.artist_owner_id))));
-- No INSERT/UPDATE/DELETE policies: only triggers (SECURITY DEFINER) write here.

-- ============ Audit triggers ============
CREATE OR REPLACE FUNCTION public.cr_log_submission_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cr_audit_log(submission_id, actor_id, action, payload)
    VALUES (NEW.id, auth.uid(), 'submitted', jsonb_build_object('title', NEW.title, 'status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.cr_audit_log(submission_id, actor_id, action, payload)
      VALUES (NEW.id, auth.uid(), 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status));
      IF NEW.status IN ('accepted','rejected') THEN
        INSERT INTO public.cr_audit_log(submission_id, actor_id, action, payload)
        VALUES (NEW.id, auth.uid(), 'decision_finalized',
          jsonb_build_object('outcome', NEW.status,
                             'reason', NEW.rejection_reason,
                             'notes', NEW.rejection_notes));
      END IF;
      IF OLD.status IN ('accepted','rejected') AND NEW.status NOT IN ('accepted','rejected') THEN
        INSERT INTO public.cr_audit_log(submission_id, actor_id, action, payload)
        VALUES (NEW.id, auth.uid(), 'reopened', jsonb_build_object('previous', OLD.status));
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER cr_submissions_audit
  AFTER INSERT OR UPDATE ON public.cr_submissions
  FOR EACH ROW EXECUTE FUNCTION public.cr_log_submission_event();

CREATE OR REPLACE FUNCTION public.cr_log_vote_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cr_audit_log(submission_id, actor_id, action, payload)
    VALUES (NEW.submission_id, NEW.voter_id, 'vote_cast',
      jsonb_build_object('vote', NEW.vote, 'note', NEW.note));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.vote IS DISTINCT FROM OLD.vote OR NEW.note IS DISTINCT FROM OLD.note THEN
      INSERT INTO public.cr_audit_log(submission_id, actor_id, action, payload)
      VALUES (NEW.submission_id, NEW.voter_id, 'vote_changed',
        jsonb_build_object('from', OLD.vote, 'to', NEW.vote, 'note', NEW.note));
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER cr_votes_audit
  AFTER INSERT OR UPDATE ON public.cr_committee_votes
  FOR EACH ROW EXECUTE FUNCTION public.cr_log_vote_event();
