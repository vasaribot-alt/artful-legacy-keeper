INSERT INTO public.alliance_outreach_targets (name, country, category, website, contact_email, contact_person, status, tag)
SELECT v.name, v.country, 'registrars', v.website, nullif(v.email,''), nullif(v.person,''), 'not_contacted', 'registrar_associations'
FROM (VALUES
 ('Australasian Registrars Committee (ARC)','Australia & New Zealand','https://registrars.org.au/','arcenquiries@registrars.org.au',''),
 ('UK Registrars Group (UKRG)','United Kingdom','https://www.ukregistrarsgroup.org/','secretary@ukregistrarsgroup.org',''),
 ('Registrars Deutschland e.V.','Germany','https://registrars-deutschland.de/?lang=en','info@registrars-deutschland.de',''),
 ('Association Française des Régisseurs d''Oeuvres d''Art (AFROA)','France','https://www.afroa.fr/','asso.afroa@gmail.com',''),
 ('Registrarte — The Italian Association of Art Registrars','Italy','https://www.registrarte.org/en/','gp.ghislainepardo@gmail.com','Ghislaine Pardo'),
 ('Nordic Registrars Group','Denmark, Finland, Norway, Sweden','https://www.facebook.com/ERC2014/','',''),
 ('Agrupación de Registros de Museos e Instituciones Culturales Españolas (ARMICE)','Spain','https://armice.wordpress.com/','icomarmice@gmail.com',''),
 ('Nederlandse Registrars Groep (NRG)','Netherlands','https://nederlandseregistrarsgroep.nl/','registrarsgroep@gmail.com',''),
 ('Swissregistrars','Switzerland','https://www.swissregistrars.ch/en/','info@swissregistrars.ch',''),
 ('Austrian Registrars Committee (ARC)','Austria','https://www.austrianregistrars.at/','arc@austrianregistrars.at','Teresa Krah'),
 ('The Hungarian Registrars Group','Hungary','https://www.facebook.com/HungarianRegistrarsGroup/','hungarianregistrarsgroup@gmail.com',''),
 ('Association of Registrars and Collections Specialists (ARCS)','Global','https://www.arcsinfo.org/','info@arcsinfo.org',''),
 ('Registrars Committee of the American Alliance of Museums (RCAAM)','USA','https://www.aam-us.org/','aamcommunities@aam-us.org','')
) AS v(name,country,website,email,person)
WHERE NOT EXISTS (
  SELECT 1 FROM public.alliance_outreach_targets t WHERE lower(t.name) = lower(v.name)
);