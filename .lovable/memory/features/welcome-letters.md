---
name: Welcome Letters
description: Auto-queued, foundation-approved welcome email for every new artist, with website discovery and the website/domain/estate offers
type: feature
---
- Every artist signup queues a row in `welcome_letters` (status queued/drafted/sent/skipped, unique per user_id); foundation-only RLS.
- "Welcome letters" section in the foundation dashboard (above "Getting started"): Prepare, Read and send, Save for later, Skip, re-run lookup. Nothing sends automatically.
- `prepare-welcome-letter` edge function: asks the AI gateway for a candidate site, then builds name/email-domain/TLD candidates and confirms each by fetching the page and matching the artist's name. Composes the letter: Research-page import shortcut (or an offer of personal help when no site was found), their own GARF website at /site/slug, pointing their own domain at it, and naming heirs for the archive.
- `send-welcome-letter` sends through sendRawEmail (label `welcome_letter`, from outreach@, idempotent per row) and marks the row sent.
- Getting started table shows the discovered website per artist plus whether their GARF site is on.
