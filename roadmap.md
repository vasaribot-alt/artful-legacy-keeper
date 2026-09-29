## Gunnar Kvaran — advisory board & Norway referrals (2026-09-29)
- [x] Meeting held 2026-09-29; very positive — he agrees GARF is very important
- [ ] Send warm thank-you note (draft for Jan's approval)
- [ ] Formal advisory-board invitation (commitment first; funding and Obrist only if he raises them)
- [ ] After commitment: ask for introduction to his contacts close to the Hoffmanns ("her sister!" — warmer route than the cold LUMA letter)
- [ ] Use his open referral offer ("refer to me to anyone in Norway") for Norwegian patrons/institutions
- [ ] Note his boards across Europe + Museum of Montenegro as possible future doors

## Institutional Data Exchange — Gunnar's idea (2026-09-29)
- [x] Drafted one-page concept note: GARF_Institutional_Data_Exchange_Concept_Note.docx (museums/galleries contribute artist data → get verified access in return; artist consent is the hard guardrail)
- [ ] Share with Gunnar (with thank-you note or later); possible pilot via his Montenegro museum connection after he joins the board

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
- [x] Home page choices: portrait, featured artwork, or opening works grid
- [x] Visual artwork selection with image list and expandable series
- [ ] Set setup + annual fee amounts before launch
- [ ] Wire billing to Stripe once cards arrive (lifetime fee model, legacy mode on death)
- [ ] Foundation custom-domain approval UI (currently manual)

## Scanning service (deferred, 2026-09-16)
- [ ] Catalogue and document scanning offered as a GARF service. On hold until scanner costs are known; likely based in the Netherlands or Germany. Then decide: provider directory vs request form, who may provide, pricing display, whether scans upload straight into the artist archive.

## Estate handover retry (2026-09-17)
- [x] Keep handovers waiting and retryable until the heir has a matching account and archive access is granted

## Registrar presentation pages (2026-09-17)
- [x] registrar_entries + registrar_entry_images tables, get_registrar_presentation RPC
- [x] Public presentation page: career, education, selected project work with photos, systems, areas of work
- [x] Registrar-owned editor at /registrar/presentation (add/reorder/delete entries, photos with captions, visibility)
- [x] Freelance availability: open to work, availability note, rate indication, travel
- [x] Registrar portal review (2026-09-17): client workspace covers archive management; Documents section added (uploads stored in the client's own archive, registrar storage policies added); credentials page at /registrars/{id} with editor at /registrar/presentation, linked from the registrar home

- [x] Merge welcome letters into role-aware Getting started overview; add collector and registrar welcomes; mark old queue welcomed.

## Partnership outreach — awaiting replies (2026-09-23)
- [x] TAAT (The African Arts Trust) — emailed, awaiting reply. If yes, name in DOEN proposal + ask for 1–2 East African grantee sub-partners.
- [x] DARIAH / DANS — emailed, awaiting reply. Goal: join working group as Cooperating Partner; strengthens DOEN "well embedded".
- [x] Culture Helps Solidarity consortium — emailed all four (ECF, Insha Osvita, zusa, VETERANKA). Awaiting any reply to co-apply for displaced Ukrainian artists' archives project.
- [x] Kastanje video call held (2026-09-28); agreed to send Mariana a formal partner invitation (tasks, budget share, GARF contribution).
- [x] Kastanje invitation sent by Jan 2026-09-28: budget split left open (not agreed on the call — €10,000 figure removed; split to be agreed together once partners confirm).
- [x] Third partner enquiry sent by Jan 2026-09-28: Mystetskyi Arsenal (Kyiv; office@artarsenal.gov.ua; Dir. Gen. Olesia Ostrovska-Liuta). IZOLYATSIA still in conversation as alternative; fallback €20,000 with Kastanje + GARF.
- [ ] Await replies from Kastanje and Mystetskyi Arsenal; confirm third partner for the €30,000 tier.
- [ ] DOEN proposal: insert TAAT + sub-partners once confirmed; sanity-check €150k ask.

## Monitor China traffic (2026-09-23)
- [ ] Watch China in weekly analytics country breakdown (16 visitors this week, 3rd after NO/US, organic)
- [ ] If sustained/growing over several weeks, consider China-focused outreach (artist association / curators' network)

## Public navigation consistency (2026-09-26)
- [x] Use the main page's logo, menu order and links across the nine agreed public pages
- [x] Provide a compact menu at narrower widths; leave the signed-in workspace unchanged

## Collector portfolio presentation (2026-09-27)
- [x] Combine medium and support as “Medium on Support” without a repeated support line
- [x] Show Reserve price on owner and shared portfolio views, falling back to Current market value

## Public menu typography (2026-09-27)
- [x] Match About's eyebrow, heading, description, alignment, and spacing across the nine public menu pages
- [x] Bring secondary headings and readable text closer to About's type scale where inconsistent

## Artist invitations from institution/gallery data (on hold — Jan designing the approach)
- [ ] Invite artists found in gallery rosters / institution data to start catalogue work; Foundation reviews every invitation before sending. What the artist receives is still to be decided by Jan.
- [ ] Lead: Audun Eckhoff (Norwegian art historian), contact details coming from the Swedish restorer.
- [ ] Idea: explore a Lovable cooperation, since this could grow faster than GARF can finance.
