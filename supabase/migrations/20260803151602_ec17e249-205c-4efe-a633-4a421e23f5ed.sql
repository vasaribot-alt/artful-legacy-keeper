CREATE TABLE public.outreach_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_email_templates TO authenticated;
GRANT ALL ON public.outreach_email_templates TO service_role;

ALTER TABLE public.outreach_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foundation can manage outreach email templates"
ON public.outreach_email_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'foundation'))
WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE TRIGGER update_outreach_email_templates_updated_at
BEFORE UPDATE ON public.outreach_email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();