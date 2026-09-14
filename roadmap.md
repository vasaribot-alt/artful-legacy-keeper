## GARF and IAA/USA partner logos (2026-09-01)
- [x] Create a polished GARF logo asset and downloadable logo package
- [x] Place GARF and IAA/USA marks together on the public landing page
- [x] Use the GARF mark as the site favicon


## Portfolio picker data leak (2026-09-01)
- [x] Add owner_id + role_context filters to portfolio artwork picker
- [x] Scope exhibition/series/gallery-view artwork queries to owner + role
- [x] Tighten public artworks RLS to artist-context works only

## Targets document: add "why this matters to artists" (2026-09-03)
- [x] Add a section to GARF_Targets_and_Long_Term_Goals explaining why GARF matters to artists and their heirs, collectors, institutions and art historians
- [x] Generate v3 PDF

## Dutch collections outreach — Why GARF Matters (2026-09-08)
- [x] Build public /why-garf-matters page from the Why GARF Matters PDF
- [x] Add route + tracked-link destination
- [x] Update corporate_collections email guidance: per-work donation ask (EUR 1-5/work) + auto tracked link to the page
- [x] Change ask to a single concrete EUR 5 per contemporary work
- [x] Bank transfer details on /donate (interim until Stripe cards arrive): IBAN, BIC ABNANL2A, KvK
- [ ] Activate Stripe once the bank cards arrive
- [ ] User to select Dutch contacts on Alliance Outreach and generate/send

## Statement of Support (2026-09-12)
- [x] Public /statement-of-support page with optional public listing
- [x] Foundation admin view of signatories (export/contact base)

## Artist Websites (2026-09-14)
- [x] artist_websites table + public get_artist_site lookup (slug or approved custom domain)
- [x] "My Website" dashboard page: on/off, slug, home/about/contact content, work selection
- [x] Public site pages /site/:slug (Home, Works, About, Contact) + own-domain serving
- [ ] Set setup + annual fee amounts before launch
- [ ] Wire billing to Stripe once cards arrive (lifetime fee model, legacy mode on death)
- [ ] Foundation custom-domain approval UI (currently manual)
