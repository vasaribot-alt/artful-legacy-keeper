# IFAR-style CR artist profile

Model the public artist entry on IFAR's Catalogues Raisonnés database: one scholarly profile per artist, with the CR project(s) attached underneath. Public read, committee/owner write.

## 1. Extend `profiles` with IFAR scholarly fields

Add (nullable, additive — nothing existing is touched):

- `birth_country` text — IFAR keys browse by country of birth, not current residence
- `death_country` text
- `nationality` text — distinct from country (e.g. born in Algeria, French national)
- `period_activity_start` int, `period_activity_end` int — IFAR's "Period of Artist's Activity" buckets (e.g. 1950–present)
- `cr_listed` boolean default false — gate for the public CR directory
- `cr_status` text — `in_preparation` | `published` | `digital_only`
- `cr_scope` text — what the CR covers: paintings, drawings, prints, sculpture, complete works…
- `cr_compilers` text — author(s) of the catalogue raisonné
- `cr_sponsor` text — sponsoring foundation / institution
- `cr_contact_email` text — public scholarly contact (separate from `profiles.email`)
- `cr_website_url` text — link if the CR is published online
- `cr_first_volume_year` int, `cr_publisher` text, `cr_isbn` text — for published CRs

## 2. RLS

- New SELECT policy on `profiles` for `anon` + `public`: `cr_listed = true` only. Existing owner/registrar policies untouched.
- Mirror SELECT grants on `cv_entries`, `artwork_images`, `artworks` already exist for founding artists — extend to "cr_listed" the same way so the public profile can render exhibition history and a few key works.

## 3. Public routes

```text
/cr                    A–Z directory of cr_listed artists, IFAR-style filters
                       (name search, country of birth/death, period of activity,
                        published vs. in-preparation)
/cr/artist/:gar        Scholarly artist profile (IFAR-style layout)
```

`/cr/artist/:gar` layout:

```text
┌────────────────────────────────────────────────────────┐
│ ARTIST FULL NAME                                       │
│ b. 1932, Algiers, Algeria — d. 2017, Paris, France     │
│ French · Active 1950–2010                              │
├────────────────────────────────────────────────────────┤
│ Catalogue Raisonné                                     │
│   Status:        In Preparation                        │
│   Scope:         Paintings, 1955–2010                  │
│   Compilers:     X, Y                                  │
│   Sponsor:       The Raisonné Foundation               │
│   Contact:       cr@theraisonne.org                    │
│   Online:        theraisonne.org/cr/artist/GAR-…       │
├────────────────────────────────────────────────────────┤
│ Biography (short scholarly note)                       │
│ Chronology / Exhibitions (from cv_entries)             │
│ Selected works (from artworks, verified only)          │
└────────────────────────────────────────────────────────┘
```

## 4. Owner / committee editor

Add a "Catalogue Raisonné" tab on the existing profile editor that surfaces only the new `cr_*` fields plus the `cr_listed` toggle. No new editor screen — just one panel inside the current profile form.

## 5. Out of scope (later)

- Separate `cr_projects` table for artists with multiple distinct CRs (Picasso has many). For now, one CR per artist is enough; we can split later without breaking the URL or the public page.
- Donation prompt on the directory (IFAR had one). Stripe is dormant per project memory.

## Technical notes

- Migration is purely additive; no data backfill needed.
- `/cr/artist/:gar` resolves via the existing `lookup_cr_artist` function (UUID or numeric GAR).
- Public directory query: `select … from profiles where cr_listed = true order by full_name`.
- A–Z buckets in UI: client-side `substr(full_name,1,1)` grouping, matching IFAR's A–E / F–K / L–Q / R–Z tabs.
