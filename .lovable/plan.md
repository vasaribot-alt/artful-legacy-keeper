# Committee Review for Catalogue Raisonné

Build a review workflow where a committee of registrars (acting for a deceased-artist estate) votes on submitted works, records decisions with notes and rejection reasons, and keeps a tamper-evident audit log.

## Scope of this step

This is the **review engine only**. Public submission forms, CR-number assignment rules, and "rejected attributions" public publishing are separate later steps. We build the committee-facing UI and the data plumbing.

## Data model (new tables)

```text
cr_submissions
  id, artist_owner_id, submitted_by, submitted_at
  title, year_estimated, medium, dimensions_h/w/d
  provenance, condition_notes, owner_contact
  image refs (reuse artwork_images via temporary artwork shell? — see Decision A)
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'deferred'
  decision_at, decision_by (committee member who finalized)
  rejection_reason (enum), rejection_notes (text)
  resulting_artwork_id (nullable, set when accepted)

cr_committee_votes
  id, submission_id, voter_id (registrar uuid)
  vote: 'accept' | 'reject' | 'defer' | 'abstain'
  note (text), created_at
  unique(submission_id, voter_id)  -- one vote per member, can be updated

cr_audit_log
  id, submission_id, actor_id, action, payload jsonb, created_at
  action: 'submitted' | 'vote_cast' | 'vote_changed' | 'note_added'
           | 'status_changed' | 'decision_finalized' | 'reopened'
```

RLS: all three tables gated by `has_registrar_access(auth.uid(), artist_owner_id)` for read/write, plus the artist's own profile owner if present. Audit log is **append-only** (no UPDATE/DELETE policy).

### Decision A — image storage for submissions

Reuse the existing `artwork-images` bucket with a `cr_submissions/<id>/` prefix and a parallel `cr_submission_images` table. When accepted, images are linked/copied to the new artwork row. Keeps the submission lightweight and avoids polluting the `artworks` table with non-catalogued works.

## Routes & UI

```text
/registrar/client/:ownerId/committee
  ├─ Inbox      → list of submissions, filter by status
  ├─ /:submissionId   → review detail page
  └─ /log       → full audit log for this estate
```

### Inbox
- Columns: thumbnail, title (working), submitter, submitted date, status badge, vote tally (e.g. "2 accept · 1 defer · 0 reject"), your vote chip.
- Quick filters: Pending my vote · Under review · Decided · Rejected · Deferred.

### Submission detail
- Left: image carousel + zoom, metadata panel (provenance, condition, owner contact).
- Right column:
  - **Your vote**: 4-button row (Accept / Reject / Defer / Abstain) + note textarea. Saving upserts your vote and writes audit log entry.
  - **Committee votes**: list of members with their vote chip + note + timestamp.
  - **Decision panel** (visible to anyone with registrar access, action gated by quorum — see Decision B): "Finalize as Accepted" / "Finalize as Rejected" buttons. Rejection requires a reason (dropdown: *Not by artist · Insufficient provenance · Condition/integrity · Duplicate · Other*) plus optional notes.
  - **Audit log** (collapsible): chronological event stream.

### Decision B — quorum

Configurable per estate (`profiles.committee_quorum`, default 2). Finalize button is enabled when:
- ≥ quorum votes cast, AND
- A clear majority for one outcome (ties → defer).
- Any committee member can press Finalize — we don't auto-finalize, to preserve human authorship of the decision.

On finalize:
- Accepted → create `artworks` row owned by `artist_owner_id`, copy images, link `resulting_artwork_id`, set status `accepted`.
- Rejected → status `rejected`, keep submission record, no artwork row created.
- Reopen action available (writes `reopened` audit entry, status returns to `under_review`).

## Audit log mechanics

Server-side trigger writes entries for every meaningful change:
- Insert into `cr_submissions` → `submitted`
- Insert/update on `cr_committee_votes` → `vote_cast` / `vote_changed`
- Status transitions on `cr_submissions` → `status_changed` + `decision_finalized` when terminal
- Manual notes via a small "Add committee note" action → `note_added`

The log is **read-only** in the UI and in RLS. Each entry stores `actor_id`, the action verb, a small `payload` (e.g., `{from: 'submitted', to: 'under_review'}` or `{vote: 'accept'}`), and timestamp.

## What's NOT in this step

- Public submission form for outside owners (next step).
- CR-number assignment logic (next step — likely manual field on accepted artworks).
- Public "Rejected attributions" listing.
- Email notifications to committee members on new submissions.
- A "deceased artist / estate" profile flag — for now any profile with multiple registrars can use it. We'll formalize the estate profile type once the workflow is proven.

## Build order

1. Migration: three tables, RLS, triggers for audit log.
2. `/registrar/client/:ownerId/committee` inbox page.
3. Submission detail page with vote panel + decision panel + audit log view.
4. Seed a couple of test submissions for the existing test estate so you can click through.
5. Memory entry documenting the workflow.

A separate task will add the public submission form; that's the right moment to also decide the estate-profile flag and CR-number scheme.
