UPDATE public.alliance_outreach_targets
SET contact_email = 'info@iaa-europe.eu',
    notes = COALESCE(notes, '') || E'\n\nGeneral secretariat: info@iaa-europe.eu | https://iaa-europe.eu/contact/'
WHERE name = 'IAA Europe';

INSERT INTO public.alliance_outreach_targets (
  name,
  country,
  category,
  website,
  contact_email,
  contact_person,
  contact_title,
  status,
  notes
) VALUES
(
  'Jerome Ince-Mitchell (IAA Europe President)',
  'United Kingdom',
  'artist_organisations',
  'https://www.jerome.org.uk/',
  'info@a-n.co.uk',
  'Jerome Ince-Mitchell',
  'President, IAA Europe / Chair, a-n Artists Council',
  'to_contact',
  'IAA Europe President representing the UK national committee through a-n The Artists Information Company. No direct public email found; best route is a-n general contact (info@a-n.co.uk) or his artist website contact form. LinkedIn: Jerome I-M. Goal: invite him to discuss GARF participation at the 6 October Malmö symposium.'
),
(
  'Geir Egil Bergjord (IAA Europe Vice President)',
  'Norway',
  'artist_organisations',
  'https://www.norskebilledkunstnere.no/',
  'styreleder@norskebilledkunstnere.no',
  'Geir Egil Bergjord',
  'Vice President, IAA Europe / Chair, Norske Billedkunstnere',
  'to_contact',
  'IAA Europe Vice President representing Norway through Norske Billedkunstnere (NBK). Direct email listed on NBK contact page: styreleder@norskebilledkunstnere.no. Goal: invite him to discuss GARF participation at the 6 October Malmö symposium and a possible Norway-Denmark-Sweden Nordic angle.'
),
(
  'Anders Werdelin (IAA Europe Treasurer)',
  'Denmark',
  'artist_organisations',
  'https://bkf.dk/',
  'kontakt@bkf.dk',
  'Anders Werdelin',
  'Treasurer, IAA Europe / Board member, Billedkunstnernes Forbund (BKF)',
  'to_contact',
  'IAA Europe Treasurer representing Denmark through Billedkunstnernes Forbund (BKF). No direct public email found; best route is BKF general contact: kontakt@bkf.dk. Goal: invite him to discuss GARF participation at the 6 October Malmö symposium and the Copenhagen/Malmö regional connection.'
);