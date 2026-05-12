# Catalogue Raisonné as a Separate Product

Launch the CR workflow as its own branded frontend on a separate domain, while reusing the existing Lovable Cloud backend (artists, registrars, identity, payments, and the `cr_*` tables we already built).

## The shape of it

```text
globalartistregistry.org           → living artists (current product, unchanged)
catalogueraisonne.org  (or sim.)   → new CR product, separate brand
        │
        └──── same Lovable Cloud backend ────┐
                                              │
              shared: profiles, registrars,   │
              verifications, storage,         │
              cr_submissions, cr_votes,       │
              cr_audit_log, cr_status_tokens  │
```

Two frontends, one database. A registrar serving an estate logs into the CR site; a living artist never sees CR language. Public submitters land on the CR site only.

## How we build it (concretely)

1. **Remix the current project** into a new Lovable project — call it e.g. `catalogue-raisonne`. Same backend gets connected (same Supabase project ref), so all `cr_*` tables, RLS, RPCs and the `lookup_cr_artist` / `create_cr_submission` functions are immediately usable.
2. **Strip the CR remix down** to only the screens that belong to the scholarly product:
   - Public landing (what a CR is, how submissions work, the committees)
   - `/cr/submit/:artistId` (already built)
   - `/cr/status/:token` (already built)
   - Registrar login → committee inbox → submission detail (already built as `/registrar/client/:ownerId/committee`)
   - Estate / deceased-artist profile pages (public-facing scholarly view)
   - Remove: artist self-service dashboard, artwork CRUD as artist, exhibitions editor, donation flows, founding-artist marketing — none of this belongs on a CR product.
3. **Strip the current project down** in the opposite direction:
   - Remove or hide the CR submit/status/committee routes from the living-artists product.
   - Keep the `cr_*` data layer intact (it's just unused from this frontend).
4. **Brand the CR product distinctly**: serif-forward, museum-catalogue typography, monochrome but heavier (think Yale University Press / Wildenstein Plattner Institute), distinct logo, distinct domain. Goal: a contemporary artist visiting the CR site immediately understands "this is not for me."
5. **Domains**: point a new domain (e.g. `catalogueraisonne.org`) at the new Lovable project. Living-artist domain stays on this project.
6. **Estate-profile flag** (deferred but worth naming now): add `profiles.profile_kind = 'living' | 'estate'` later, so the same artist record can be promoted to an estate without data migration. Until then, "any profile with a committee of registrars" is treated as an estate by the CR frontend.

## What stays shared vs duplicated

```text
SHARED (one source of truth, in the backend)
  profiles · user_roles · registrar_invites · verifications
  artworks · artwork_images · storage buckets
  cr_submissions · cr_committee_votes · cr_audit_log
  Stripe customer + subscription tables
  Veriff sessions

DUPLICATED (per-frontend, intentionally)
  Branding, copy, landing pages
  Auth screens (different wording, same Supabase auth)
  Navigation + sidebar
  Public profile presentation
```

## Migration risk: near zero

Because the CR tables and RPCs already exist in this project's backend, the new frontend just consumes them. No data move, no double-entry, no sync logic. If we later decide to split backends, we can — but we won't have to.

## What I'd do first, in order

1. You confirm the direction and a working name / domain for the CR product.
2. I remix this project into the new CR project and connect it to the same Lovable Cloud backend.
3. I strip the CR remix to only the scholarly surfaces and build a proper CR landing + estate profile layout.
4. I remove the CR routes from this (living-artists) project so the two products visually never collide.
5. We point the new domain and soft-launch with one estate (the test estate we already use for committee review).

## What's not in scope yet

- Estate-profile type flag in `profiles` (do it once we have a second real estate).
- CR-number assignment scheme (manual field on accepted artworks until we have a curator preference).
- Public "rejected attributions" listing (sensitive — handle after first real committee accepts a workflow).
- Email notifications to committee members (nice-to-have, after the manual flow is proven).

If you're happy with this shape, tell me a working name for the CR product and I'll start with step 2.
