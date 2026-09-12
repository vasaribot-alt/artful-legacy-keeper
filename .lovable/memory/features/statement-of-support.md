---
name: Statement of Support
description: Public /statement-of-support page collecting collector/artist endorsements with optional public listing, used as advocacy evidence and contact base
type: feature
---
Public page at `/statement-of-support` (route in App.tsx, page `src/pages/StatementOfSupport.tsx`).

- Framed as a "Statement of Support" / declaration, never a "petition" — collectors value discretion.
- Fields: full name, email, signatory type (collector/artist/curator/gallery/institution/other), country, organisation, short comment, `is_public` checkbox.
- Public listing shows first name + country only. Private signatures still count in the total.
- Table `public.statement_signatories`: anon/authenticated may insert (validated in RLS WITH CHECK), only `foundation` role may read raw rows. Public reads go through `get_statement_signatories()` and `get_statement_signatory_count()`.
- Unique index on lower(email); duplicate signature returns a friendly message.
- Linked from the "The ask" section of `/why-garf-matters`.
- Purpose: endorsement evidence for UNESCO/funder pitches plus a reusable contact base.
