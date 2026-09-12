CREATE TABLE public.statement_signatories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  country text,
  signatory_type text NOT NULL DEFAULT 'collector',
  organisation text,
  comment text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX statement_signatories_email_key ON public.statement_signatories (lower(email));

GRANT INSERT ON public.statement_signatories TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.statement_signatories TO authenticated;
GRANT ALL ON public.statement_signatories TO service_role;

ALTER TABLE public.statement_signatories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can sign the statement"
ON public.statement_signatories FOR INSERT TO anon, authenticated
WITH CHECK (
  length(trim(full_name)) BETWEEN 1 AND 120
  AND length(email) BETWEEN 5 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND coalesce(length(country), 0) <= 80
  AND coalesce(length(organisation), 0) <= 160
  AND coalesce(length(comment), 0) <= 600
  AND signatory_type IN ('collector','artist','curator','gallery','institution','other')
);

CREATE POLICY "Foundation can read signatories"
ON public.statement_signatories FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can update signatories"
ON public.statement_signatories FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'foundation'))
WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can delete signatories"
ON public.statement_signatories FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'foundation'));

CREATE OR REPLACE FUNCTION public.get_statement_signatories()
RETURNS TABLE(display_name text, country text, signatory_type text, organisation text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT split_part(trim(s.full_name), ' ', 1) AS display_name,
         s.country,
         s.signatory_type,
         s.organisation,
         s.created_at
  FROM public.statement_signatories s
  WHERE s.is_public = true
  ORDER BY s.created_at DESC
  LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.get_statement_signatory_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM public.statement_signatories;
$$;

REVOKE ALL ON FUNCTION public.get_statement_signatories() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_statement_signatory_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_statement_signatories() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_statement_signatory_count() TO anon, authenticated, service_role;