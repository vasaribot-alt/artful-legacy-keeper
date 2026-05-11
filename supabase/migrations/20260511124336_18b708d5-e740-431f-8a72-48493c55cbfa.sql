ALTER TABLE public.cr_submissions ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS cr_submissions_public_token_idx ON public.cr_submissions(public_token);

CREATE OR REPLACE FUNCTION public.get_cr_submission_status(_token uuid)
RETURNS TABLE(
  id uuid,
  title text,
  status text,
  created_at timestamptz,
  decision_at timestamptz,
  rejection_reason text,
  cr_number integer,
  artist_name text,
  artist_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.title, s.status, s.created_at, s.decision_at, s.rejection_reason, s.cr_number,
         p.full_name, s.artist_owner_id
  FROM cr_submissions s
  LEFT JOIN profiles p ON p.user_id = s.artist_owner_id
  WHERE s.public_token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_cr_submission_timeline(_token uuid)
RETURNS TABLE(action text, created_at timestamptz, payload jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT al.action, al.created_at,
    jsonb_build_object(
      'to', al.payload->>'to',
      'from', al.payload->>'from',
      'outcome', al.payload->>'outcome',
      'reason', al.payload->>'reason'
    )
  FROM cr_audit_log al
  JOIN cr_submissions s ON s.id = al.submission_id
  WHERE s.public_token = _token
    AND al.action IN ('submitted','status_changed','decision_finalized','reopened')
  ORDER BY al.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_cr_submission_status(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cr_submission_timeline(uuid) TO anon, authenticated;