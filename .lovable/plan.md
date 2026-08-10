# GARF Registrar Registry — Verified Directory of Professional Registrars

A public, browsable directory of vetted professional registrars that artists and collectors can contact for documentation help — with a Foundation-controlled vetting process aligned to professional credentials.

---

## Concept

Today the registrar system is *closed*: an artist or collector can only connect with a registrar they already know by email. This creates a **public directory** of Foundation-verified registrars, turning GARF into the connector between artists/collectors and professional documentation expertise.

Based on your decisions:
- **Fully public** — anyone can browse the directory (SEO + discoverability)
- **Professional credentials** as the primary vetting criterion
- **Gated contact** — inquiries go through GARF; registrar's email hidden until they accept
- **ARCS alignment** — vetting criteria informed by the Association of Registrars and Collections Specialists (arcsinfo.org), with an optional ARCS membership field

---

## Database

### New table: `registrar_profiles`

Stores the registrar-specific enrichment data. Kept separate from `profiles` (which already has many CR-specific fields) for clarity.

| Field | Type | Purpose |
|---|---|---|
| `user_id` | uuid, FK → auth.users, PK | One row per registrar |
| `specializations` | text[] | e.g. ["Contemporary", "Photography", "Old Masters"] |
| `credentials` | text | Formal training / qualifications description |
| `years_experience` | integer | Years in the field |
| `languages` | text[] | Working languages |
| `geographic_coverage` | text | e.g. "Nordic countries", "Europe", "Worldwide" |
| `professional_statement` | text | Short bio / approach statement |
| `is_listed` | boolean, default false | Whether they appear in the public directory |
| `is_verified` | boolean, default false | Foundation has approved their application |
| `verified_at` | timestamptz | When verification was granted |
| `verified_by` | uuid | Foundation reviewer |
| `arcs_member` | boolean, default false | ARCS membership declared |
| `arcs_member_id` | text | Optional ARCS membership number |
| `created_at` / `updated_at` | timestamptz | Timestamps |

RLS: SELECT public for `is_listed = true AND is_verified = true` rows (public directory). Full access for own row (`user_id = auth.uid()`). Foundation role gets all access.

### New table: `registrar_applications`

The vetting workflow — a registrar submits this, Foundation reviews it.

| Field | Type | Purpose |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → auth.users | Applicant |
| `credentials` | text | Formal training description |
| `experience_summary` | text | Years, institutions, project types |
| `specializations` | text[] | Areas of expertise |
| `languages` | text[] | Working languages |
| `geographic_coverage` | text | Regions served |
| `professional_statement` | text | Short statement |
| `references_json` | jsonb | Array of {name, institution, email, relationship} |
| `arcs_member` | boolean | ARCS membership declared |
| `arcs_member_id` | text | Optional membership number |
| `status` | text, default 'pending' | pending → under_review → approved/declined |
| `reviewed_by` | uuid | Foundation reviewer |
| `reviewed_at` | timestamptz | |
| `review_notes` | text | Internal Foundation notes |
| `created_at` / `updated_at` | timestamptz | |

RLS: INSERT/SELECT for own row (`user_id = auth.uid()`); UPDATE only by Foundation role. Foundation SELECT all.

### Contact flow: reuse `registrar_access`

No new table needed. When an artist/collector clicks "Contact this registrar" in the directory, the app inserts a `registrar_access` row with `requested_by = 'owner'`, `status = 'pending'`, and the registrar's `user_id`. The registrar sees this as a pending request in their existing dashboard and approves it — the exact flow already built. The registrar's email stays hidden until they accept.

---

## Pages

### 1. `/registrars` — Public Directory (no auth)

A clean, searchable directory page following the visual pattern of `/founding-artists`:
- Header with title and short description
- Search bar: filter by name, specialization, language, geographic coverage
- Grid of registrar cards showing: name, avatar, specializations (as tags), languages, geographic coverage, verified badge, short statement excerpt
- "Contact this registrar" button on each card — redirects to `/login` if not signed in, otherwise opens a small dialog to send an inquiry message and creates the pending `registrar_access` row
- Only registrars with `is_listed = true AND is_verified = true` appear

### 2. `/registrar/apply` — Application Form (registrar-only)

A form for registrars to apply for verified status:
- Fields: credentials, years of experience, specializations (multi-select), languages, geographic coverage, professional statement, references (add/remove rows), ARCS membership toggle + member ID
- If an application already exists, show its status (pending / under review / approved / declined) with Foundation notes if declined
- On approval, a trigger sets `registrar_profiles.is_verified = true` and `is_listed = true`
- Accessible from the registrar sidebar as "Get Verified"

### 3. `/foundation/registrars` — Foundation Review (foundation-only)

Admin dashboard for reviewing applications:
- Table of all applications with status badges
- Click to expand and review full details
- Approve / Decline buttons with optional notes
- Approved registrars get `is_verified = true` in `registrar_profiles`
- Section showing currently verified registrars with ability to revoke (sets `is_verified = false, is_listed = false`)
- Accessible from the Foundation sidebar as "Registrar Registry"

---

## Navigation

- **Public nav** (Index page): add "Registrars" link alongside "Supporters"
- **Registrar sidebar**: add "Get Verified" item pointing to `/registrar/apply`
- **Foundation sidebar**: add "Registrar Registry" item pointing to `/foundation/registrars`

---

## ARCS Alignment

[arcsinfo.org/membership](https://www.arcsinfo.org/membership) — Association of Registrars and Collections Specialists.

ARCS membership is open to professionals employed in registration or collections care at museums/related organizations (including independent contractors), those serving museums in for-profit roles, students in related studies, and retired practitioners. Membership is tiered by income ($35–$100/yr).

The `arcs_member` and `arcs_member_id` fields capture this. In v1 they are self-declared by the applicant and shown to the Foundation reviewer as a vetting signal. The Foundation reviewer can use ARCS membership as a strong positive signal (but not the sole criterion) when evaluating applications. A future enhancement could cross-reference ARCS membership via a shared verification protocol.

**Vetting criteria informed by ARCS eligibility:**
- Formal training in art history, museum studies, archive management, or equivalent
- Employment history in registration or collections care (museum, gallery, private collection)
- Documented experience with catalogue raisonné or archival documentation projects
- ARCS membership (optional, self-declared with member ID)
- Professional references

---

## Technical notes

- One migration creates both tables with GRANTs and RLS policies
- A trigger copies approved application data into `registrar_profiles` and flips `is_verified`/`is_listed` when an application status changes to 'approved'
- Public directory query uses a SECURITY DEFINER function `get_verified_registrars()` returning only listed+verified rows with safe fields (no email, no phone — those stay gated)
- Contact flow inserts via the existing `registrar_access` table — no schema change to that table needed
- All new UI matches the existing monochrome minimalist design system
- Artist and collector experiences are untouched
