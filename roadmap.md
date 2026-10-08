## Gunnar Kvaran — advisory board & Norway referrals (2026-09-29)
- [x] Meeting held 2026-09-29; very positive — he agrees GARF is very important
- [ ] Send warm thank-you note (draft for Jan's approval)
- [ ] Formal advisory-board invitation (commitment first; funding and Obrist only if he raises them)
- [ ] After commitment: ask for introduction to his contacts close to the Hoffmanns ("her sister!" — warmer route than the cold LUMA letter)
- [ ] Jan's dream (2026-10-02): tell Gunnar he dreams of working with Hans Ulrich Obrist, naive ask "do you know anyone that knows him?" — Gunnar and Obrist co-curated China Power Station, Imagine Brazil and Europe, Europe; tell Gunnar after board commitment. Obrist is Senior Advisor at LUMA Arles, so the Hoffmann route and the Obrist dream converge.
- [ ] Use his open referral offer ("refer to me to anyone in Norway") for Norwegian patrons/institutions
- [ ] Note his boards across Europe + Museum of Montenegro as possible future doors

## Margriet Schavemaker — advisory board candidate (2026-10-01)
- [x] Invitation drafted + revised 2026-10-01 (nothing sent): personal advisory-board invite to margrietschavemaker@gmail.com — 100-year preservation framing, light commitment, no museum pitch. Final close: video call at her convenience, offer to come see her if she's interested. Opening states openly Jan is Norwegian but set up the foundation in The Hague (worked there a lot; Holland good for foundations) — the earlier "neighbours in The Hague / coffee" close was dropped as overclaiming proximity
- [x] Added 2026-10-01: one-line background pointer to the Why GARF Matters page, framed as context ("for background, here is a short page on what the foundation does and why") — tracked link https://globalartistregistry.org/r/MSCHV41 so a page-open signals she read it; placed near the end, before the closing
- [x] Invitation sent by Jan 2026-10-01 to margrietschavemaker@gmail.com (personal advisory-board invite; tracked Why GARF Matters link https://globalartistregistry.org/r/MSCHV41 included before the closing) — awaiting her reply
- [ ] Follow up on her reply: if positive, arrange video call (offer to come see her in person if interested)
- [ ] HOLD the Kunstmuseum Den Haag museum outreach entry while the board invitation is pending — no museum pitch before she answers personally
- [ ] Fit: expert in new forms of collecting, archiving and co-creation; preserving new-media artworks; former Mondriaan Fund advisor, Jan van Eyck Academy supervisory board; based in The Hague where GARF is registered
- [ ] Contact: margrietschavemaker@gmail.com (personal, found at the bottom of her bio page on margrietschavemaker.nl) — use this for the personal board invitation; institutional fallback mschavemaker@kunstmuseum.nl



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
- [x] Mystetskyi Arsenal declined (no capacity) but copied in Dir. Gen. Olesia Ostrovska-Liuta and gave a real recommendation — send a proper thank-you.
- [x] UFDA partner enquiry sent by Jan 2026-09-30 via their website contact form ("Dear UFDA team", plain text, asked to be forwarded to the right person). IZOLYATSIA remains the backup.
- [x] UFDA replied (Anna Cherevko, Head of Operations, is now the contact — Yehor asked the same seven points earlier). Final reply prepared for Jan's approval, addressed to Anna, covering all seven points (scope, UFDA's role, 15-artist pilot, workflow, timeline, €30,000 three-partner tier, outputs/responsibilities) + 1-page project brief written.
- [ ] Send UFDA reply to Anna Cherevko with GARF_UFDA_Project_Brief.docx attached (pilot figure approved by Jan: 15 artists); reply text delivered to Jan 2026-10-07, ready to copy-send; arrange call next week.
- [ ] Await replies from Kastanje, IZOLYATSIA; confirm third partner for the €30,000 tier.
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

## Gunnar's museum & gallery pitch (2026-09-30)
- Gunnar: contact museums (collection holdings) and galleries (rosters) asking for documentation on contemporary artists — very short pitch, max 3 points, understanding tone.
- [x] Both pitches drafted (museum + gallery, 3 points each, exchange + consent guardrail).
- [x] Reply to Gunnar's warm follow-up (gb.kvaran@gmail.com, sent 2026-09-30) asking for his feedback on the pitches — sent by Jan 2026-09-30.
- [ ] After Gunnar's feedback: start Norwegian institutions first, using Gunnar's name as referral, reviewed batches.
- [x] Add Norwegian review batch to Alliance Outreach: 17 active commercial galleries and 19 contemporary-art museums/institutions; Golsa replaced by Eiklid/Rusten; Høyersten Contemporary (Bergen) added 2026-09-30. Nothing sent.
- [x] Trondheim additions added 2026-10-01: K.U.K. (Kjøpmannsgata Ung Kunst) and PoMo. Batch now 18 galleries + 20 museums.
- [x] Jan completed all missing contact details on Norwegian and Dutch batches (2026-10-01); Cobra Museum category label aligned. Galleri Blunk intentionally has no named contact (student-run, rotating board). Still "To contact", nothing sent.
- [x] Galleri Blunk (Trondheim) moved to "On hold" (2026-10-01): Google lists it permanently closed, site last edited 2023. Keep in batch; when approached use preservation-only pitch, sent last — or revisit via K.U.K./PoMo. Trondheim is now led by K.U.K. and PoMo.

## Pitch approach revised — simpler ask (2026-10-01)
- [x] Jan revised the approach: galleries get a yes/no question (are you positive to sharing your documentation with your artists when they create a free GARF account to build a complete catalogue of their production?) — if yes, gallery provides artist names + emails only; NO archive access offered to galleries. Museums are asked for contemporary artists in the collection with, per artist: name, approximate number of works, contact details — building a collected-artists list with work counts; verified archive access kept as the museum thank-you.
- [ ] Rewrite museum + gallery drafts (EN + NO) to the new wording; refresh the short note to Gunnar (draft ready in chat).
- [ ] Dutch-language versions of the new pitches before any Dutch sends.
- Drafts prepared (museum + gallery version), presented for Jan's approval — nothing sent.
- Ties to Institutional Data Exchange: contribute documentation → verified access; artist consent guardrail; docs used only to identify and invite the artist (orphan artworks flow).

## Dutch batch — same exchange pitch, smaller scale (2026-09-30)
- Context: ANBI application in the Netherlands makes Dutch institutional visibility valuable.
- [x] Added review batch `netherlands_institutions_2026` to Alliance Outreach: 10 museums/institutions + 8 contemporary galleries, all with publicly listed emails, all "to contact". Nothing sent.
- Note: West Den Haag is a non-profit exhibition space (formerly Galerie West), listed under institutions; Rijksakademie included for alumni documentation. Mondriaan Fonds left out (funder, not a collection holder).
- [ ] Send in small reviewed batches after Gunnar's feedback on the pitch wording; Dutch-language version of the pitch to be drafted before sending.

## 2026-10-01 (sent 2026-09-30)
- [x] Rewritten email to Gunnar (what-GARF-is-first pitch, 3 points + ask) sent 2026-09-30.
- [x] Gunnar's feedback received 2026-10-01: needs time; his main concern is the **legal relationship to the artists** — unsure whether artists must be enrolled before GARF contacts institutions holding their data.
- [x] Jan replied to Gunnar 2026-10-01 with the actual mechanism: documentation is never placed in a profile under the artist's name; it goes into a temporary bulk database, then the artist is contacted and invited to build their own archive. Lighter option: names-only list so we can contact the artists directly. Jan expects Gunnar's reply soon.

When Gunnar replies: his concern was the legal relationship to the artists; the answer is the orphan-works holding database (no artist-named profiles, artist claims their own archive). Expect a quick reply to Jan's 2026-10-01 explanation.
- [x] Pitches adjusted 2026-10-01 to the two-option ask: (1) share documentation → temporary holding database → artist invited, decides alone, deleted if declined; (2) names-only list → we contact the artists. Museum (EN + NO), gallery (EN) drafts updated; Dutch-language version still to be drafted before Dutch sends.
- [x] Short reply to Gunnar sent by Jan 2026-10-01 (simplified ask: galleries = yes/no + names/emails, no archive access; museums = names + work counts + contacts, archive access as museum thank-you). Awaiting his reply; on his go-ahead, Norwegian batch starts (Gunnar as referral, Astrup Fearnley + Audun Eckhoff first).
- [ ] After Gunnar's go-ahead: start Norwegian institutions first (Gunnar as referral), reviewed batches; Norwegian-language pitches ready (museum version drafted); Dutch-language pitch draft before Dutch batch sends.

## Strategy change — artists first (Gunnar, 2026-10-05)
- Gunnar's advice: recruit 10–20 artists first (free CR, run by GARF); then, WITH each artist's consent (they hold copyright), contact institutions for their documentation. Legally stronger + builds artist goodwill.
- [x] Fredrik Værslev already on board (artist #1).
- [ ] Jan calls Gunnar Wednesday 2026-10-07 (after IAA-Europe symposium, Malmö, 2026-10-06).
- [x] Gunnar supplied six suggested recipients 2026-10-07: Tori Wrånes, Ida Ekblad, Matias Faldbakken, Frida Orupabo, Sandra Mujinga, and Elmgreen & Dragset; Fredrik Værslev already involved. He offered help with email addresses.
- [x] Drafted six individual artist-first invitations for Jan's review in GARF_Gunnar_Artist_Invitation_Drafts.docx: authenticity, documentation, long-term historical overview; free artist-controlled catalogue infrastructure, no transfer of copyright or ownership; artists request institutional extracts themselves. Norwegian for five individual artists, English for Elmgreen & Dragset. Six one-page letters visually checked; document validation passed. Nothing sent; recipient addresses await Gunnar or official-source verification.
- [x] Addresses received from Fredrik's round 2026-10-08: Ida Ekblad (ida@computerprincess.com), Matias Faldbakken (matias-f@online.no / matias.faldbakken@gmail.com), Frida Orupabo (fridaorupabo@gmail.com). Added as "Til:" lines in GARF_Gunnar_Artist_Invitation_Drafts_v2.docx; verified one page each. Ready to send.
- [ ] Still no address: Sandra Mujinga only — awaiting Fredrik or Gunnar. Tori Wrånes (toriwraanes@gmail.com) and Elmgreen & Dragset (mail@elmgreen-dragset.com) already supplied 2026-10-07.
- [ ] Complete the first group of 10–20 artists; consider Fredrik's introductions for further names.
- [ ] Simple artist consent/authorisation letter: artist asks named institutions to share their documentation with GARF.
- [ ] Institutional batches (NO/NL/international) paused until consents exist; re-word asks as "on behalf of artist X".
- [x] International galleries batch added to outreach 2026-10-01: 51 major galleries (White Cube, Hauser & Wirth, Gagosian, Pace, Zwirner, etc.) tagged international_galleries_2026, all "to contact", no emails yet — research official emails before any send. Non-gallery entries from source list (collectives, Rebuild Foundation, SCCA, Studio Tomas Saraceno, arebyte) excluded. Nothing generated or sent. CLEARING moved to "On hold" 2026-10-01 (closed Aug 2025, NY + LA; Brussels entity now independent under Lodovico Corsini — preservation-only pitch if ever approached). CLEARING contact details added 2026-10-01 from their live contact page: pip@c-l-e-a-r-i-n-g.com, NY + LA addresses/phones.
- [x] Closed-gallery preservation pitch approved by Jan 2026-10-01 as the standing template for closed galleries (CLEARING first, Galleri Blunk when approached): personal letter to the founder, ask them to forward the free-account suggestion to their artists (we provide the forwardable text + help artists start), plus offer to preserve the gallery's own exhibition archive free of charge. Saved to project memory; nothing sent.
- [x] Peres Projects (Berlin) added to the closed-gallery track 2026-10-03: declared insolvent by Amtsgericht Charlottenburg (opened April 2025); administrator Christian Otto (HWW, christian.otto@hww.eu) controls company dispositions and should receive the gallery-archive preservation offer; founder Javier Peres (jp@ / javier@peresprojects.com) gets the personal letter + forwardable artist text. Both letters approved by Jan and SENT 2026-10-04; entry marked contacted with follow-up note (~2 weeks). Final texts preserved in /mnt/documents/Peres_Projects_letters.docx.
- [x] Mega-gallery pitch adapted 2026-10-01: same simplified ask, adds scale acknowledgment (no obligation to cover whole roster, gallery chooses which artists). Wording approved by Jan; nothing sent. Emails still to be researched per gallery.
- [ ] IACCCA collectors approach (approved 2026-10-01): museum-style ask (names + work counts + contacts), but thank-you access is SCOPED — collector sees only archives of artists in their own collection who have registered. Requires new permission model (collection-scoped collector access) to be designed/built before any IACCCA sends. Draft pitch prepared; nothing sent.
- [x] IACCCA closing text rewritten 2026-10-01 (Jan's approved wording: names + rough work counts, contact details optional, long lists may be trimmed to artists who would benefit; scoped free access as thank-you). Saved as `iaccca_collections` guidance in generate-outreach-email — IACCCA-tagged targets now skip the donation ask. Nothing sent.

## Stroom Den Haag — The Hague Artists database (2026-10-03)
- [x] Reviewed https://www.thehagueartists.nl/information: Stroom-run database of 1,000+ professional artists living/working in The Hague; artists maintain their own portfolios + CVs; searched by curators, commissioning clients, galleries, Stroom advisory committees. Contact: hknl@stroom.nl, +31 70 365 8985.
- [x] Added to the Dutch batch 2026-10-03 (Jan approved): Stroom Den Haag (The Hague Artists database) in `alliance_outreach_targets`, tag `netherlands_institutions_2026`, status "to contact", verified public contact hknl@stroom.nl. Dutch batch now 11 institutions + 8 galleries. Partnership pitch (not rescue): database is a discovery tool with no preservation guarantee; exchange pitch, Dutch-language version still required before sending. Nothing sent.

## Research-project framing + Cultuurfonds (2026-10-02)
- [ ] Decide with Jan: frame the museum/gallery questions as part of a research project on securing digital artists' documentation for the future (one framing line in the pitches; honest — the curator/registrar needs analysis is real research). Cultuurfonds application possible via Ingvar's overview (document not yet shared).
- [ ] Ingvar has made an Excel overview of possible applications (Cultuurfonds among them) — not yet shared with us; ask Jan to upload it so we can map applications to projects.
- [ ] Cultuurfonds requires a draft application **4 months before project start** — work backwards from a chosen start date once Ingvar's sheet is reviewed.
- [ ] Jan's idea (2026-10-02): the museum/gallery outreach as now planned doubles as the research project's first step — the replies give us a lead on how to run it. Use step one to draft how we want to run the project.
- [ ] Longer arc: if the research project lands well, it could become what the EU wants — positioning for a much larger EU-scale project later (Creative Europe consortium memory exists).

## Curator needs-analysis validation — first reply (2026-10-02)
- [x] First curator reply received from **Steffen Gregersen Håndlykken**, curator at Haugar kunstmuseum (Tønsberg); also chair of Arrangørutvalget for visuell kunst 2026–27, former UKS chair and 1857 co-founder. Answers: studio visits remain the top tool, nothing substitutes them; GARF's value = building lists, clearing rights, organising transport, and a better overview of available works per artist. Artist-authored records trusted IF identity verified + institutions co-sign. Institution willing to confirm hosted exhibitions IF it is easy to do. Single biggest item: image rights clearance — most time-consuming, should be off-loadable to a system.
- [x] Permission to quote Håndlykken's reply in the DOEN proposal / needs-analysis: Jan is in direct contact with Steffen and will ask him by phone.
- [ ] **Open question to Steffen (by phone):** how does Haugar actually clear image rights today? Fold the answer into C4 (rights-clearance workflow) design and the needs-analysis.
- [ ] **Second input same day:** Jan will also ask his ex-wife over dinner (2026-10-02) — input pending; ask what her art-world role is so her answer is logged with the right context.
- [ ] Map answers to feature ranks: strengthens C4 (rights-cleared images → make rights clearance a workflow, not just a filter), C3 (institutional attestations — keep the confirm flow one-click simple), C6/C8 (available-works overview per artist), R1 (co-signed due diligence).
- [ ] Decide with Jan: send a short thank-you reply (and possibly one follow-up question about how they clear rights today).

## Martin Gelin — journalist follow-up (2026-10-07)
- [x] Introduction letter drafted and delivered as GARF_Martin_Gelin_Introduction.docx: presents GARF + Jan's authentication background (co-funded Europe's most advanced technical art research lab; all large auction houses as clients). Information-only, no ask.
- [ ] Send letter to Martin Gelin; board invitation only later, once good contact exists.
- [ ] Note his book "Art as Soft Power" (Swedish, English edition coming) — possible future hook.

## IAA Europe partner-letter campaign (2026-10-07)
- Master partner letter built from Jan's letter to Marie (Chair, Billedkunstnernes Forbund / IAA-Denmark): NO version ready to send + EN template with [bracketed] fields for all other organisations. Delivered as GARF_IAA_Partner_Letter_Marie_and_Template.docx.
- All letter links verified live (join/iaa-denmark, garf-logo.png, garf-org-button.png); partner row iaa-denmark exists and is active with dashboard key.
- Added closing section: free guarantee (free registration, artists own/control archives, handover to chosen heirs) + offer of short video call.
- Next: send Marie's letter; then adapt the EN template per country — fetch each org's dashboard key from partner_organisations before sending.

## Caroline McCormick — UK funding adviser (2026-10-08)
- [x] Video meeting held 2026-10-08: GARF asked about funding help, told her honestly that GARF has little money; she said she would like to help with her best tips. Caroline@achates.org.uk (verified by Jan).
- Roles: Chair of a Foundation's Board of Trustees; Director of Achates (cultural sector consultancy); 2019 Achates Philanthropy Prize speech.
- [ ] Do NOT draft or send any letter to Caroline — Jan did not ask for one. Wait until he says what he wants.
- [x] Her follow-up guidance (2026-10-08): name-drop ambassadors as supporters when approaching Bloomberg; sharpen the why-this-matters message first; Jan will ask her how to run the outreach once he has enough ambassadors; she is open to frequent calls.
- [ ] Build the ambassador base and confirm each supporter's permission to be named.
- [ ] Sharpen the core "why this matters" message into one page.
- [ ] Jan asks Caroline how to do the outreach when the ambassador base is strong enough.

## Update 2026-10-08
- [x] UFDA reply + brief sent to Anna Cherevko — awaiting reply / call next week
- [x] Martin Gelin letter sent
- [x] Jan reviewed the six Gunnar artist drafts
- [ ] Find direct artist emails for the six (no gallery pass-on) — asked Fredrik first 2026-10-08; if he has none of them, ask Gunnar. Never a gallery address.
