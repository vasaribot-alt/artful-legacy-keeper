alter table public.alliance_outreach_targets add column if not exists tag text;
alter table public.alliance_outreach_targets add column if not exists decision_maker_research text;
alter table public.alliance_outreach_targets add column if not exists research_at timestamptz;

insert into public.alliance_outreach_targets
  (name, country, category, contact_email, contact_person, contact_title, status, tag, notes)
values
('Sparebankstiftelsen DNB','Norway','corporate_collections','anders.bjornsen@sparebankstiftelsen.no','Anders Bjørnsen',null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 901 40 861.'),
('Sparebanken Øst','Norway','corporate_collections','paal.strand@oest.no','Pål Strand','Adm. dir.','to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('Sparebanken Norge','Norway','corporate_collections',null,null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('Equinor Art Programme','Norway','corporate_collections',null,'Grete Årbu','Kurator','to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 51 99 00 00 / +47 95 91 06 87.'),
('Hydro Art Collection','Norway','corporate_collections',null,null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 22 53 81 00.'),
('Rasmussen Collection','Norway','corporate_collections','juba@rasmussen-eiendom.no',null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 920 24 724.'),
('Morten Fredriksen Collection','Norway','corporate_collections','mortenef@gmail.com','Morten Fredriksen',null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 958 33 444.'),
('Riis Bilglass','Norway','corporate_collections',null,'Frithjof Andreas Lilje Riis',null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 414 60 677.'),
('Aker Solutions / Aker BP','Norway','corporate_collections',null,null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('Aker ASA — The Main Corporate Collection','Norway','corporate_collections','atle.kigen@akerasa.com','Atle Kigen',null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 907 84 878.'),
('Yggdrasil Contemporary Street Art Project','Norway','corporate_collections',null,null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('The Telenor Art Collection','Norway','corporate_collections','post-telenorkulturarv@telenor.com',null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 810 77 000.'),
('Tangen Collection (AKO Foundation)','Norway','corporate_collections','enquiries@akofoundation.org',null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('Storebrand Art Collection','Norway','corporate_collections',null,null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 915 08880.'),
('KLP Art Collection','Norway','corporate_collections','klp@klp.no',null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 55 54 85 00.'),
('Nordea Art Collection','Norway','corporate_collections',null,null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('Canica AS Collection','Norway','corporate_collections','post@canica.ch',null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('Kistefos Art Collection','Norway','corporate_collections','hege.galtung@kistefos.no','Hege Galtung',null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 23 11 70 00.'),
('Ståhl Collection (Norrköping)','Sweden','corporate_collections','kontakt@stahlcollection.se',null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('SEB Art Collection','Sweden','corporate_collections','martin.joanson@seb.se','Martin Joanson',null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +46 70 535 64 11.'),
('SSE Art Initiative (Stockholm School of Economics)','Sweden','corporate_collections','artinitiative@hhs.se','Tinni Ernsjöö Rappe','Director','to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +46 8 736 90 00.'),
('Public Art Agency Sweden (Statens Konstråd)','Sweden','corporate_collections','henrik.orrje@statenskonstrad.se','Henrik Orrje',null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +46 768 559 859.'),
('The Carlsberg Foundation & New Carlsberg Foundation','Denmark','corporate_collections','sekretariatet@ncf.dk',null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +45 33 11 37 65.'),
('Saxo Bank Art Collection','Denmark','corporate_collections','brl@birthelaursen.com','Birthe Laursen',null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('Novo Nordisk Art Collection','Denmark','corporate_collections','info@arthubcopenhagen.dk',null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('ABN AMRO Art Collection','Netherlands','corporate_collections','art-heritage@nl.abnamro.com',null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('Rabo Art Collection','Netherlands','corporate_collections','kunstzaken@rabobank.nl',null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('De Nederlandsche Bank (DNB) Art Collection','Netherlands','corporate_collections','kunstcommissie@dnb.nl',null,null,'to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +31 20 524 9111.'),
('NN Group Art Collection','Netherlands','corporate_collections','artandculture@nn-group.com','Maartje de Roy van Zuydewijn','Curator','to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('PoMo — Reitan Museet','Norway','corporate_collections','marit@pomo.no','Marit Album Kvernmo','Direktør','to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).'),
('Fred. Olsen','Norway','corporate_collections','post@fredolsen.no','Anette Olsen','Owner','to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections). Phone: +47 22 34 10 00.'),
('Aars AS','Norway','corporate_collections','nina@aars.no','Nina Sørlie','Kurator','to_contact','seed_funding','Seed-funding shortlist (Nordic & Dutch corporate collections).')
on conflict do nothing;