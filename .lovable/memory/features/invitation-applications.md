---
name: Invitation Applications
description: Public /apply-for-invitation form and Foundation review at /foundation/invitation-requests that issues invite codes by email
type: feature
---
Artists (and collectors, galleries, institutions, registrars) can apply for an invitation instead of needing a code up front.

- Public page `/apply-for-invitation` posts to the `invitation-request` edge function (no auth), which stores the row in `invitation_requests`, notifies the Foundation inbox and sends the applicant a confirmation.
- One open application per email; repeat submissions are silently treated as duplicates.
- Foundation reviews at `/foundation/invitation-requests`. Approving calls `decide-invitation-request` (foundation role only), which creates an `invite_codes` row with the chosen tier and emails the code plus a prefilled `/register?invite=CODE` link. Declining just records the status.
- Statuses: new, reviewing, approved, declined.
