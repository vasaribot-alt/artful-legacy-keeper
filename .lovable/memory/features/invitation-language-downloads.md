---
name: Invitation Language Downloads
description: Public /invitation page offering the artist invitation PDF in EN, DE, FR, ES, IT, PL; English is authoritative
type: feature
---
Artist organisations forward the artist invitation to their members. To remove the language barrier:

- Public page `/invitation` (`src/pages/InvitationDownloads.tsx`) lists the invitation in English, German, French, Spanish, Italian and Polish, with each download button labelled in that language.
- PDFs are static files in `public/invitation/GARF_Invitation_to_Artists_<CODE>.pdf`, generated with reportlab (DejaVu Sans for full diacritics), one page each.
- English is the authoritative version; every translation carries a one-line note stating this, repeated on the page.
- The page repeats the "What we are asking — and what we are not asking" section (forward only, no member data, free for life, not a marketplace).
- The `generate-outreach-email` edge function tells artist organisations that the invitation can be downloaded in those six languages at https://globalartistregistry.org/invitation.
- To add a language: translate the JSON content, render a new PDF into `public/invitation/`, and add an entry to `LANGUAGES` in the page.
