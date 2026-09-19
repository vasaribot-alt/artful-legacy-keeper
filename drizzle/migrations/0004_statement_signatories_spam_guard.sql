CREATE OR REPLACE FUNCTION public.guard_statement_signatory()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reject obvious junk: links, profanity, and non-name content in the name field
  IF NEW.full_name ~* '(https?://|www\.|\.com|\.net|\.org|\b(dick|porn|pussy|viagra|casino|crypto|nft)\w*)' THEN
    RAISE EXCEPTION 'invalid signatory name' USING ERRCODE = '22023';
  END IF;
  IF NEW.email ~* '(https?://|www\.)' OR NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid signatory email' USING ERRCODE = '22023';
  END IF;
  IF NEW.comment IS NOT NULL AND NEW.comment ~* '(https?://|www\.)' THEN
    RAISE EXCEPTION 'links are not allowed in comments' USING ERRCODE = '22023';
  END IF;
  IF NEW.organisation IS NOT NULL AND NEW.organisation ~* '(https?://|www\.)' THEN
    RAISE EXCEPTION 'links are not allowed in the organisation field' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_statement_signatory_before_insert ON public.statement_signatories;
CREATE TRIGGER guard_statement_signatory_before_insert
BEFORE INSERT ON public.statement_signatories
FOR EACH ROW
EXECUTE FUNCTION public.guard_statement_signatory();