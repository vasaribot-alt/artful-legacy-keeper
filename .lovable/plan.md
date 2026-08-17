# Correspondence Archive — Phase 1

Let artists (and estates, registrars on their behalf) deposit their email correspondence into GARF, search it, and link messages to artworks and exhibitions. No mailbox connection in this phase — upload of standard export files only.

## What the artist experiences

1. **New page: Correspondence** (`/correspondence`, in the sidebar next to Files)
   - Empty state explains how to export from Gmail (Takeout → `.mbox`) and Outlook (`.eml` / `.msg` drag out of the client), with a short "what happens to my mail" privacy note.
   - Upload area accepting `.mbox`, `.eml`, and `.zip` of `.eml` files.
2. **Selective ingest before anything is stored**
   - After parsing, a review step shows: number of messages, date range, top correspondents, total attachment size.
   - The artist chooses what to keep: date range, and include/exclude specific senders/domains (e.g. exclude bank, family).
   - Only the selected messages are stored.
3. **Search and read**
   - Full-text search over subject and body, with filters: person, year range, has attachments, linked artwork/exhibition.
   - Results list → message reader showing headers, plain-text body, attachment list (downloadable), and the thread it belongs to in order.
4. **Links to the archive**
   - On a message: "Link to artwork / exhibition" using the existing picker pattern.
   - Automatic suggestions: messages whose subject/body mention an artwork title or GAWID, or whose attachment filename matches an artwork image, are proposed for linking and confirmed by the artist.
   - Artwork and exhibition pages get a "Correspondence" section listing linked messages by date.
5. **Access control per message**
   - Each message has a visibility state: `private` (default — only the owner and approved registrars), or `embargoed until <year>` for material intended for future scholarship.
   - Nothing in correspondence is ever public in this phase; the embargo field is metadata for the future, and clearly labelled as such.
   - Per-message and bulk delete, with the original file's stored copy updated accordingly.

## Technical shape

**Storage buckets** (both private)
- `correspondence-originals` — the untouched uploaded `.mbox`/`.eml`, archival evidence.
- `correspondence-attachments` — extracted attachments, stored once per SHA-256 hash per user.

**Tables** (public schema, RLS + GRANTs, `owner_id` + `role_context` per project convention)
- `correspondence_imports` — one row per uploaded file: file name, size, storage path, status (`uploaded` / `parsed` / `ingested` / `failed`), counts, date range.
- `correspondence_messages` — `owner_id`, `import_id`, `message_id_header`, `thread_key`, `sent_at`, `from_name`/`from_email`, `to_emails[]`, `cc_emails[]`, `subject`, `body_text`, `body_html_path` (nullable, stored in the bucket when large), `visibility`, `embargo_until_year`, `search_tsv` (generated tsvector, GIN indexed).
- `correspondence_attachments` — message id, file name, mime, size, `sha256`, storage path.
- `correspondence_links` — message id + (`artwork_id` | `exhibition_id`), `confidence`, `status` (`suggested` / `confirmed` / `rejected`), mirroring the existing `artwork_match_suggestions` approval pattern.

**Parsing** — new edge function `parse-correspondence`: reads the uploaded original from storage, splits `.mbox` into messages, decodes MIME (quoted-printable/base64, charsets), extracts plain-text body and attachments, deduplicates attachments by hash, and writes rows. Runs in chunks so a large mailbox doesn't hit the request timeout; the import row tracks progress and the UI polls it.

**Quotas** — attachment and original bytes are added to `get_user_storage_usage` as new sources (`correspondence-original`, `correspondence-attachment`) so the existing tier meter and `assertWithinQuota` cover it with no separate accounting.

**Suggestions** — a second edge function matches message text and attachment filenames against the owner's artworks/exhibitions and inserts `suggested` links. Deterministic matching (titles, GAWID, filenames) first; no AI needed in this phase.

## Explicitly out of scope for Phase 1

- Gmail / Outlook OAuth mailbox sync (Phase 2, read-only scope).
- Public or researcher-facing access to correspondence.
- `.pst` import (needs a converter; document the Outlook `.eml` route instead).
- HTML email rendering beyond a sanitised text view.

## Note for you

Because a mailbox contains third parties who never consented, I'll add a short deposit notice the artist must acknowledge before the first ingest, and keep the whole feature private-by-default. A proper deposit agreement drafted with the Foundation's counsel should replace that notice before this is promoted publicly.
