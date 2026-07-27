
CREATE TABLE public.alliance_outreach_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT,
  category TEXT NOT NULL DEFAULT 'curators',
  website TEXT,
  contact_email TEXT,
  contact_person TEXT,
  status TEXT NOT NULL DEFAULT 'to_contact',
  last_contacted_at TIMESTAMPTZ,
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alliance_outreach_targets TO authenticated;
GRANT ALL ON public.alliance_outreach_targets TO service_role;

ALTER TABLE public.alliance_outreach_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foundation can view outreach targets"
  ON public.alliance_outreach_targets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can insert outreach targets"
  ON public.alliance_outreach_targets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can update outreach targets"
  ON public.alliance_outreach_targets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'))
  WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can delete outreach targets"
  ON public.alliance_outreach_targets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE TRIGGER update_alliance_outreach_targets_updated_at
  BEFORE UPDATE ON public.alliance_outreach_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_alliance_outreach_category ON public.alliance_outreach_targets(category);
CREATE INDEX idx_alliance_outreach_status ON public.alliance_outreach_targets(status);
CREATE INDEX idx_alliance_outreach_country ON public.alliance_outreach_targets(country);

INSERT INTO public.alliance_outreach_targets (name, country, category, website, status) VALUES
  ('Norsk Kuratorforening (The Norwegian Association of Curators)', 'Norway', 'curators', 'https://www.norskkuratorforening.no', 'to_contact'),
  ('IKT — International Association of Curators of Contemporary Art', 'International', 'curators', 'https://www.iktsite.org', 'to_contact'),
  ('Independent Curators International (ICI)', 'International', 'curators', 'https://curatorsintl.org', 'to_contact'),
  ('Association of Art Museum Curators (AAMC)', 'United States', 'curators', 'https://www.artcurators.org', 'to_contact');
