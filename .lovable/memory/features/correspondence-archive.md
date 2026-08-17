---
name: Correspondence Archive
description: Private email/letter archive at /correspondence — mbox/eml/zip deposit, selective ingest, full-text search, artwork & exhibition links, embargo metadata
type: feature
---

- Page `/correspondence` (artist sidebar). Deposit `.mbox` (Gmail Takeout), `.eml`, or `.zip` of `.eml`. No mailbox OAuth in Phase 1 — Gmail/Outlook read-only sync is Phase 2.
- Two private buckets: `correspondence-originals` (untouched deposit = archival evidence) and `correspondence-attachments` (deduplicated by SHA-256, path `{uid}/{hash[0:2]}/{hash}`).
- Tables: `correspondence_imports`, `correspondence_messages` (trigger-maintained `search_tsv`; a *generated* tsvector column is impossible because `array_to_string` is not immutable), `correspondence_attachments`, `correspondence_links` (suggested/confirmed/rejected, mirrors `artwork_match_suggestions` approval pattern).
- Edge function `parse-correspondence` runs in chunks of 120 messages with `action: analyze | ingest`; the client loops until `done`. Own MIME reader in `mime.ts` (RFC 2047 words, quoted-printable, base64, multipart, latin1 pre-decode). `suggest-correspondence-links` does deterministic title/GAWID/filename matching — no AI.
- Selective ingest is mandatory: review step (count, date range, top correspondents, attachment size) with date filter, per-correspondent exclusion, skip-attachments, and a deposit acknowledgement checkbox. Nothing is stored before the artist confirms.
- Privacy: never public. Visibility is `private` or `embargoed` (+ `embargo_until_year` as archival metadata only). Approved registrars can read and confirm/reject suggestions, never delete. A counsel-drafted deposit agreement should replace the in-app acknowledgement before public promotion.
- Correspondence bytes count toward storage tiers via `get_user_storage_usage` sources `correspondence-original` / `correspondence-attachment`.
- `CorrespondencePanel` shows linked messages on artwork detail and exhibition edit views.
