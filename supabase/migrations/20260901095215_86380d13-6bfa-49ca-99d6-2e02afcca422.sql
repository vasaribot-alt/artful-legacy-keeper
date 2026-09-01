UPDATE public.partner_organisations SET website = CASE slug
  WHEN 'iaa-austria' THEN 'https://www.igbildendekunst.at/'
  WHEN 'iaa-belgium' THEN 'https://www.cnap.be/'
  WHEN 'iaa-bulgaria' THEN 'https://www.sbhart.com/'
  WHEN 'iaa-croatia' THEN 'https://www.hdlu.hr/'
  WHEN 'iaa-cyprus' THEN 'https://www.ekatecy.com/'
  WHEN 'iaa-czech-republic' THEN 'https://www.uvucr.cz/'
  WHEN 'iaa-denmark' THEN 'https://www.bkf.dk/'
  WHEN 'iaa-estonia' THEN 'https://www.eaa.ee/'
  WHEN 'iaa-finland' THEN 'https://www.artists.fi/'
  WHEN 'iaa-france' THEN 'https://www.cnfap-artsplastiques.org/'
  WHEN 'iaa-germany' THEN 'https://www.igbk.de/'
  WHEN 'iaa-iceland' THEN 'https://www.sim.is/'
  WHEN 'iaa-india' THEN 'https://iaaindia.org/'
  WHEN 'iaa-ireland' THEN 'https://www.visualartists.ie/'
  WHEN 'iaa-israel' THEN 'https://art.org.il/'
  WHEN 'iaa-italy' THEN 'https://www.aiapi.it/'
  WHEN 'iaa-japan' THEN 'https://www.jaa-iaa.or.jp/'
  WHEN 'iaa-korea' THEN 'https://www.kfaa.or.kr/'
  WHEN 'iaa-latvia' THEN 'https://www.lms.lv/'
  WHEN 'iaa-lithuania' THEN 'https://www.ldsajunga.lt/'
  WHEN 'iaa-moldova' THEN 'https://www.arta.md/'
  WHEN 'iaa-norway' THEN 'https://www.norskebilledkunstnere.no/'
  WHEN 'iaa-poland' THEN 'https://www.zpap.pl/'
  WHEN 'iaa-portugal' THEN 'https://www.aavp.weebly.com/'
  WHEN 'iaa-san-marino' THEN 'https://www.asart.sm/'
  WHEN 'iaa-serbia' THEN 'https://www.ulus.rs/'
  WHEN 'iaa-slovakia' THEN 'https://www.svu.sk/'
  WHEN 'iaa-spain' THEN 'https://unionac.es/'
  WHEN 'iaa-sweden' THEN 'https://www.kro.se/'
  WHEN 'iaa-switzerland' THEN 'https://visarte.ch/'
  WHEN 'iaa-the-netherlands' THEN 'https://www.bbknet.nl/'
  WHEN 'iaa-turkey' THEN 'https://www.upsd.org.tr/'
  WHEN 'iaa-united-kingdom' THEN 'https://www.a-n.co.uk/'
  WHEN 'iaa-usa' THEN 'https://www.iaa-usa.org/'
  ELSE website
END
WHERE slug IN (
  'iaa-austria', 'iaa-belgium', 'iaa-bulgaria', 'iaa-croatia', 'iaa-cyprus',
  'iaa-czech-republic', 'iaa-denmark', 'iaa-estonia', 'iaa-finland', 'iaa-france',
  'iaa-germany', 'iaa-iceland', 'iaa-india', 'iaa-ireland', 'iaa-israel', 'iaa-italy',
  'iaa-japan', 'iaa-korea', 'iaa-latvia', 'iaa-lithuania', 'iaa-moldova', 'iaa-norway',
  'iaa-poland', 'iaa-portugal', 'iaa-san-marino', 'iaa-serbia', 'iaa-slovakia', 'iaa-spain',
  'iaa-sweden', 'iaa-switzerland', 'iaa-the-netherlands', 'iaa-turkey', 'iaa-united-kingdom', 'iaa-usa'
);

INSERT INTO public.partner_organisations (slug, name, country, website, parent_id, is_active)
SELECT additions.slug, additions.name, additions.country, additions.website, world.id, true
FROM (
  VALUES
    ('iaa-romania', 'Uniunea Artiștilor Plastici din România', 'Romania', 'https://uap.ro/'),
    ('iaa-south-africa', 'South African National Association for Visual Arts', 'South Africa', 'https://www.sanava.co.za/'),
    ('iaa-tunisia', 'SMAP Tunisia', 'Tunisia', 'http://smaptunisie.blogspot.com/'),
    ('iaa-china', 'China Artists Association', 'China', 'http://caanet.org.cn/'),
    ('iaa-mongolia', 'Union of Mongolian Artists', 'Mongolia', 'https://www.uma.mn/'),
    ('iaa-canada', 'CARFAC National', 'Canada', 'https://www.carfac.ca/')
) AS additions(slug, name, country, website)
CROSS JOIN (
  SELECT id FROM public.partner_organisations WHERE slug = 'iaa-world' LIMIT 1
) AS world
WHERE NOT EXISTS (
  SELECT 1 FROM public.partner_organisations existing WHERE existing.slug = additions.slug
);