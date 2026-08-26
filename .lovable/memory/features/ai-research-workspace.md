---
name: AI Research Workspace
description: Temporary staging area at /research (and registrar client tab "Research") where AI-collected public information is reviewed before it enters the archive
type: feature
---

- Page `/research` for artists (sidebar "Research"); registrars use `/registrar/client/:ownerId/research`. Same component `src/components/ResearchWorkspace.tsx`.
- Edge function `research-artist`: Firecrawl scrape of the artist website plus any gallery pages pasted by the user, Firecrawl web search, then a Gemini extraction call (`google/gemini-3.7-flash`, tool schema `artist_research_workspace`) producing profile fields, CV entries, artwork records and image URLs.
- Persistent staging tables: `research_runs` (session, seed urls, hints, status, sources) and `research_findings` (kind `profile_field | cv_entry | artwork | image`, label, value, payload, source_url, confidence, status `new | accepted | rejected`).
- Nothing is written to the live archive automatically. Accepting a finding writes it: profile fields to `profiles` (galleries and social links are appended, never replaced), CV lines to `cv_entries` (AI section keys mapped to the existing uppercase section names), artworks to `artworks` with `role_context = 'artist'`. Image findings are kept as reference links only.
- RLS: artist owns runs and findings (including delete/clear); approved registrars can start runs, read and accept/reject, but cannot delete.
