---
name: Dutch Collections outreach (Why GARF Matters)
description: Dutch corporate collections outreach with per-work donation ask (EUR 5/contemporary work), Why GARF Matters page as trackable link
type: feature
---

Dutch collections outreach (mix of VBCN and IACCCA members) asking for support.

- **Ask:** a single, concrete contribution of EUR 5 per contemporary work in their collection, which funds permanent archival preservation for artists. Alternative (low-pressure): institutional endorsement or a small joint pilot. No bank account number in the email; giving directed to the tracked Why GARF Matters page and /donate. Single ask, not two.
- **Why GARF Matters page:** public `/why-garf-matters` built from the GARF_Why_GARF_Matters.pdf content (12-slide deck). PDF downloadable from the page. Linked (not attached) in outreach emails so clicks are measurable.
- **Tracked links:** `generate-outreach-email` edge function auto-creates a per-recipient `tracked_links` row (destination `https://globalartistregistry.org/why-garf-matters`, source_table `alliance_outreach_targets`, source_id = target_id, created_by = user.id) for `corporate_collections` and embeds the `/r/:code` URL in the generated email. The TrackedLinkPanel per target shows who opened the page.
- **Guidance:** `corporate_collections` category guidance in `supabase/functions/generate-outreach-email/index.ts` rewritten to lead with the Dutch stichting / 100-year angle and the per-work donation ask. The "What we are asking / not asking" clarity section is kept.
- **Tracked destinations:** `/why-garf-matters` added to `TRACKED_DESTINATIONS` in `src/components/TrackedLinkPanel.tsx` for manual link creation.
