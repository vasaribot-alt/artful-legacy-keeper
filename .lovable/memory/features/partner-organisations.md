---
name: Partner Organisations (IAA model)
description: Branded /join/:slug member links and aggregate-only /partners/:slug board dashboards for IAA member bodies, managed at /foundation/partners
type: feature
---
Cooperation with artist member bodies (IAA-USA, IAA Europe national committees) runs in two shipped levels; a real API/SSO is a roadmap item only, never the opening ask.

**1. Organisation join links** — `partner_organisations` table (slug, name, country, contact_email, website, intro_text, dashboard_key, is_active). Each partner gets `/join/:slug`, a branded landing page they paste into their members' area or newsletter. It links to `/register?org=<slug>`; `handle_new_user` resolves the `partner_org` signup metadata to `profiles.partner_org_id`. No member lists or personal data are ever requested from the organisation.

**2. Board dashboard** — `/partners/:slug?key=<dashboard_key>`, read-only and gated by the per-org key (no login). Backed by `get_partner_org_stats(_slug, _key)`, which returns aggregates only: members registered, identity verified, artworks archived, exhibitions recorded, first/last join date. Never expose names, emails or records here.

Admin: Foundation → Partner Organisations (`/foundation/partners`) adds partners, copies both links, toggles active state, and shows joined counts.
