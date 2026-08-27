# GARF Gallery and Museum Workspace — Concept Note

## Goal
Extend GARF from an artist/collector registry into two light, integrated workspaces:

1. **GARF Gallery Manager** — for small and midrange galleries that represent artists.
2. **GARF Museum Lite** — for small and midrange museums that borrow works from collectors and other institutions.

Both products sit on the existing GARF backbone: the same artist profiles, artworks, images, exhibitions, documents, correspondence archive, and valuation fields that artists and collectors already use. The audience is deliberately not the top-tier gallery chains with global offices; it is the single-space, regional, and emerging galleries that need a simple, artist-friendly system.

## Why this fits GARF now
- The core registry already stores canonical artwork records, provenance, exhibition history, dimensions, images, and valuations.
- `galleries`, `gallery_outreach`, and `global_alliance_members` give us a gallery directory and contact layer.
- The correspondence archive, outreach templates, and email queue can power gallery CRM and museum loan correspondence.
- Artists already control their own data; extending that with consented gallery overlays avoids the lock-in problems of traditional gallery databases.

## Scope and MVP

### 1. New account roles
Add two new `app_role` values:

- `gallery` — gallery staff
- `museum` or `institution` — museum/institution staff

A user can still have dual roles the same way artists/registrars do today.

### 2. Gallery Manager — core modules

**Artist roster**
- A gallery can send a representation request to an artist.
- The artist approves or declines it.
- Once approved, the gallery sees the artist's works in a read-only canonical view and can add gallery-specific overlay data.

**Consignment inventory**
- Track whether each work is: with the gallery, with the artist, on loan, sold, returned.
- Gallery-only fields: acquisition cost, retail price, sale price, buyer, sale date, commission split, location inside the gallery.
- The artist still owns the core record; the gallery owns its commercial overlay.

**Sales tracking**
- Simple sale records linked to artworks.
- Update availability state automatically.
- Optional PDF invoice / certificate placeholders.

**Exhibition project planner**
- Reuse the existing `exhibitions` table, adding an `organizer_type` flag: `artist`, `gallery`, or `museum`.
- For galleries: create an exhibition project, pull in works from the roster, add external loans, and generate:
  - checklist
  - wall labels
  - shipping/crate list
  - loan request email drafts

**CRM and correspondence**
- Per-gallery contact book (artists, collectors, museums, shippers, insurers).
- Timeline of emails, letters, and notes per contact, reusing `correspondence_messages`.
- Track which works or exhibitions each conversation is about.

### 3. Museum Lite — core modules

**Loan request inbox**
- Museums can search collector accounts for works marked "Willing to lend" (this toggle already exists).
- Send a loan request; the collector accepts, declines, or asks for conditions.

**Exhibition planning**
- Create an exhibition project and attach requested loans.
- Track status: requested, condition report sent, approved, shipped, installed, returned.

**Condition reports**
- Simple condition report forms per artwork, with photos and notes.
- Shared between lender and borrower.

**Correspondence and CRM**
- Same contact timeline as galleries, focused on lenders, artists, shippers, and insurers.

## Data model sketch

### New tables
- `gallery_accounts` — gallery profile (name, address, website, VAT/business ID).
- `gallery_artist_representations` — gallery_id, artist_id, status, started_at, ended_at, notes.
- `gallery_inventory` — view or overlay linking gallery_account_id + artwork_id with gallery-specific fields.
- `gallery_sales` — sale records linked to artworks and gallery_account_id.
- `exhibition_projects` — could be an extension of `exhibitions` with organizer_type and project status.
- `loan_requests` — museum_id, artwork_id, owner_id, status, requested_dates, conditions.
- `condition_reports` — loan_request_id, images, notes, created_by, shared_with.

### Reused tables
- `profiles`, `user_roles`
- `artworks`, `artwork_images`, `artwork_documents`
- `exhibitions`, `exhibition_images`, `exhibition_documents`
- `correspondence_messages`, `correspondence_links`, `correspondence_imports`
- `galleries`, `global_alliance_members`
- `collector_facilities` and the existing "Willing to lend" field

## Key product decisions

**Artist consent first**
A gallery cannot simply claim an artist. The artist receives a representation request and must approve it. The artist can end the relationship at any time; the gallery overlay data is then archived but the canonical artwork record stays with the artist.

**Gallery does not edit canonical artwork**
The gallery can propose edits, which go back to the artist as a verification request, using the same pending/verified workflow that registrars already use. Or it can add overlay-only fields that do not affect the artist's record.

**Pricing is private to the gallery**
Retail price, cost, and commission splits live only in the gallery overlay. The artist does not automatically see them.

**Museum loan search is opt-in**
Only works explicitly marked "Willing to lend" by the collector/artist appear in museum search. Museums cannot browse private collections otherwise.

## Differentiation from existing tools
- **Artist-owned data**: works follow the artist across galleries, reducing re-entry.
- **Built-in museum loan pipeline**: small museums can find and request loans inside the same platform.
- **Correspondence archive**: every email, condition report, and loan letter is stored with the work.
- **Integrated with GARF identity and verification**: ID-verified artists and verified registrars carry trust into the gallery/museum workflow.
- **Lower cost/complexity than ArtLogic/Artbase/galleryManager**: aimed at galleries with one to a few spaces, not global operations.

## Suggested phasing

### Phase 1 — Gallery foundation
- Add `gallery` role and `gallery_accounts` table.
- Artist representation request/approval flow.
- Gallery dashboard showing roster and consigned works.
- Consignment state and gallery-only valuation overlay.

### Phase 2 — Gallery operations
- Sales tracking and availability updates.
- Exhibition project planner with checklist and wall labels.
- Loan request emails to museums and collectors.

### Phase 3 — Museum Lite
- Add `museum` or `institution` role.
- Search willing-to-lend works.
- Loan request workflow and condition reports.
- Museum exhibition project planner.

## Open questions for you
1. Should the first prototype focus only on the gallery side, or should we sketch the museum side in parallel?
2. Do you want gallery users to pay, or should this be a free tool to attract galleries into the GARF ecosystem?
3. Should museums be a separate role, or can we start with a broader `institution` role that covers museums, kunsthalles, and university collections?

## Next step
If this direction looks right, I will write a detailed Phase 1 plan and start with the schema, roles, and a gallery dashboard route.
