
UPDATE public.alliance_outreach_targets SET website='https://www.danskemuseer.dk' WHERE category='curators' AND country='Denmark' AND website='https://fdkm.dk';
UPDATE public.alliance_outreach_targets SET website='https://svenskcuratorforening.se' WHERE category='curators' AND country='Sweden' AND website='https://svenskakuratorer.se';
UPDATE public.alliance_outreach_targets SET website='https://www.kik-cci.ch', name='KIK//CCI — Verein Schweizer KuratorInnen von Kunstsammlungen' WHERE category='curators' AND country='Switzerland' AND website='https://kks-curator.ch';
UPDATE public.alliance_outreach_targets SET website='https://www.curators-network.eu', country='Europe' WHERE category='curators' AND website='https://curatorsnetwork.org';
UPDATE public.alliance_outreach_targets SET website=NULL, notes=COALESCE(notes||E'\n','') || 'Official website not found — verify contact via Frame Contemporary Art Finland or Finnish Museums Association.' WHERE category='curators' AND country='Finland' AND website='https://suomenkuraattoriyhdistys.fi';
