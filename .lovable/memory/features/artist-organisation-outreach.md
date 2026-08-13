---
name: Artist Organisation Outreach
description: National artist organisations are asked only to forward an attached PDF invitation to their members; no member data requested, no access codes
type: feature
---
Outreach to `artist_organisations` (IAA/UNESCO national committees, ~45 targets) works by distribution, not membership:

- The email asks the organisation only to **forward the attached invitation PDF** to its members (newsletter or members' area is fine). No member lists, emails or personal data are requested.
- No personal access codes are included for this category (unlike galleries).
- Mandatory "What we are asking — and what we are not asking" section: forward only; membership data stays with the organisation; free lifetime registration for ID-verified artists who own and can export their archive; GARF is not a marketplace/dealer/agent.
- UNESCO alignment may be mentioned for this category.
- The attachment is chosen in the Alliance Outreach dialogs (single + batch) via the Attachments picker, sourced from Foundation → Documents and sent through `send-outreach-brevo` (`attachmentDocumentIds`, 6 MB total limit).
- Forwardable member invitation PDF: "GARF_Invitation_to_Artists_Members_of_Artist_Organisations.pdf" — upload it under Foundation → Documents to make it attachable.
