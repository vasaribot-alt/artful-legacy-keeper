---
name: Artist verification workflow
description: Artist-verified tag system, auto-verification rules, registrar edit reset triggers, and pending review inbox
type: feature
---
Every artwork in the catalogue carries a `verification_status` of `verified` or `pending`. Used to assert that a verified artist personally signed off on the record.

**Auto-tagging on insert (DB trigger `set_artwork_verification_on_insert`):**
- `created_by` is set to `auth.uid()` if not supplied
- If `created_by == owner_id` (the artist added the work themselves) → `verified` immediately, `verified_by = owner_id`
- Otherwise (registrar / assistant created it) → `pending`

**Reset on registrar edit (DB triggers `revert_artwork_verification_on_update` and `..._on_image_change`):**
- If editor (`auth.uid()`) is NOT the owner AND the work was previously `verified`, AND any of these core archival fields change → revert to `pending`:
  title, year, medium, dimensions, height, width, depth, edition_number, edition_count, artist_proofs, signed
- Adding/removing rows in `artwork_images` by a non-owner also reverts a verified work to pending
- Owner edits never reset (implicit re-approval)

**UI surface:**
- `<VerificationBadge status={...} />` — dark "Artist verified" pill or amber "Pending review" pill. Used on `ArtworkCard`, `ArtworkListItem`, and the `ArtworkDetail` header.
- `<PendingVerificationInbox />` — collapsible panel at the top of the artist Dashboard (edit mode, artist role only). Shows pending works with thumbnails, supports per-row Verify, multi-select Verify, and Verify-all bulk action.
- ArtworkDetail header: owner sees a Verify / Unverify toggle button next to the badge. Artist can un-verify anytime.
- Dashboard filter dropdown "All verification / Artist verified / Pending review" available only when `activeRole === 'artist'`.

**Backfill:** Existing artworks were retroactively marked `verified` with `verified_by = owner_id` (assumes legacy works were owner-created).

Columns added to `artworks`: `verification_status` (text, check constraint), `verified_at` (timestamptz), `verified_by` (uuid), `created_by` (uuid). Index `idx_artworks_owner_verification` for fast inbox queries.
