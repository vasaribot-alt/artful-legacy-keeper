---
name: Estate Succession
description: Artists name heirs in advance; foundation activates handover, granting full management and showing estate custodianship publicly
type: feature
---
- Artists name successors in their profile ("Estate & Successors" section) via `estate_successors` (artist_id, successor_name/email, relationship, estate_display_name, notes, status named/activated/revoked).
- Foundation-only activation at `/foundation/estates` calls `activate_estate_succession(_successor_id, _death_year)`: sets `profiles.estate_managed_by` + `estate_activated_at`, optionally is_deceased/death_year, and inserts an approved `registrar_access` row so the heir gets full management through the registrar client workspace.
- Successor must already have an account with the same email address to receive access.
- Public artist page shows "Archive held by <estate name>" and birth–death years.
