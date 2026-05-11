CREATE OR REPLACE FUNCTION public.create_cr_submission(
  _artist_owner_id uuid,
  _title text,
  _year_estimated text DEFAULT NULL,
  _medium text DEFAULT NULL,
  _height numeric DEFAULT NULL,
  _width numeric DEFAULT NULL,
  _depth numeric DEFAULT NULL,
  _provenance text DEFAULT NULL,
  _condition_notes text DEFAULT NULL,
  _submitter_name text DEFAULT NULL,
  _submitter_email text DEFAULT NULL,
  _owner_contact text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_token uuid;
BEGIN
  IF _title IS NULL OR length(trim(_title)) = 0 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = _artist_owner_id) THEN
    RAISE EXCEPTION 'Artist not found';
  END IF;

  INSERT INTO cr_submissions(
    artist_owner_id, title, year_estimated, medium, height, width, depth,
    provenance, condition_notes, submitter_name, submitter_email, owner_contact, status
  ) VALUES (
    _artist_owner_id, _title, _year_estimated, _medium, _height, _width, _depth,
    _provenance, _condition_notes, _submitter_name, _submitter_email, _owner_contact, 'submitted'
  ) RETURNING public_token INTO new_token;

  RETURN new_token;
END $$;

GRANT EXECUTE ON FUNCTION public.create_cr_submission(uuid, text, text, text, numeric, numeric, numeric, text, text, text, text, text) TO anon, authenticated;