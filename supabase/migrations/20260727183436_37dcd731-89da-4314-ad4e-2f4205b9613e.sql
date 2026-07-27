-- Re-categorise all AICA entries from Curators to Art Critics
UPDATE public.alliance_outreach_targets
SET category = 'art_critics'
WHERE name ILIKE 'AICA%';

-- Add verified European curator associations to the Curators category
INSERT INTO public.alliance_outreach_targets (name, country, category, website, status) VALUES
  ('Curator''s Network', 'United Kingdom', 'curators', 'https://curatorsnetwork.org', 'to_contact'),
  ('Kuratorinnen und Kuratoren Schweiz (KKS)', 'Switzerland', 'curators', 'https://kks-curator.ch', 'to_contact'),
  ('Foreningen af Danske Kunstmuseer (FDKM) — Curators Section', 'Denmark', 'curators', 'https://fdkm.dk', 'to_contact'),
  ('Suomen Kuraattoriyhdistys — Finnish Curators Association', 'Finland', 'curators', 'https://suomenkuraattoriyhdistys.fi', 'to_contact'),
  ('Svenska Kuratorer — Swedish Curators', 'Sweden', 'curators', 'https://svenskakuratorer.se', 'to_contact');
