---
name: Email engagement tracking
description: Brevo webhook feeds delivered/opened/clicked/bounced events into email_send_log; recipients synced as Brevo contacts in the "GARF Outreach" list
type: feature
---

- Every outreach send through `send-outreach-brevo` upserts the recipient as a Brevo contact in the list **GARF Outreach** (attributes CONTACT_PERSON, CAMPAIGN, GAR_STATUS) so Brevo's own statistics and segmentation cover the sends.
- Brevo message ids are stored in `email_send_log.message_id` **without** angle brackets so webhook events match.
- `brevo-events` (public, protected by `?token=BREVO_WEBHOOK_SECRET`) records delivered / opened / click / bounce / spam / unsubscribe events onto `email_send_log` (`delivered_at`, `first_opened_at`, `last_opened_at`, `open_count`, `first_clicked_at`, `click_count`, `bounced_at`, `unsubscribed_at`, `last_event`). Hard bounces, spam and unsubscribes also insert into `suppressed_emails`.
- `brevo-register-webhook` (Foundation-only) registers/refreshes that webhook in Brevo so the secret never leaves the server. Triggered by the "Enable read tracking" button on `/foundation/email-log`.
- Open tracking is pixel-based: it under-reports when images are blocked, so treat open rate as a floor. Click counts are reliable.
