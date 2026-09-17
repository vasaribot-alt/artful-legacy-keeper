# Registrar presentation pages

Yes, this is smart. Registrars are the people who produce the documentation the whole archive depends on, and right now their entry is a few lines of text frozen from the day they applied. Katerina's CV shows what a registrar record actually looks like: dated positions at named institutions, what they did in each role, education with years, languages with levels, and photographed project work with captions.

## What the registrar gets

A presentation page they own and can edit at any time, at `/registrars/{their id}`, plus an editor under their own dashboard.

The page shows, in this order:

- Name, photo, location, years of experience, verified mark, ARCS membership
- Professional statement
- Career: dated positions with organisation, place and what the work involved (for example "1999-2011 The Hermitage, St Petersburg, Senior registrar, documentation department")
- Education with years and institution
- Selected project work: photographs with captions, opened in the full-screen viewer (for example "Fondacion MAPFRE, Madrid, 2019: unpacking loan objects")
- Specialisations, areas of work, collection systems worked with, languages, geographic coverage
- References available on request
- Their CV as a download, if they upload one
- Contact button, routed through the Foundation as today

## What changes for editing

Today a registrar has to reopen the whole verification application to change anything. Instead they get "My presentation" in their dashboard, where they can add, reorder and delete career entries, education, and project photos, edit the statement and the lists, upload a CV, and switch the page between public and hidden. Verified status and ARCS confirmation stay under Foundation control, so nothing a registrar edits can change their verified badge.

## Technical notes

- New table `registrar_entries`: user_id, kind (position, education, project), title, organisation, location, start_year, end_year, is_current, description, display_order. Owner manages own rows; public read only when the registrar is verified and listed.
- New table `registrar_entry_images`: entry_id, storage_path, caption, credit, display_order, with the same access rule.
- New public storage bucket `registrar-images` for project photographs, path `{uid}/...`, owner-only writes.
- New SECURITY DEFINER function `get_registrar_presentation(_user_id uuid)` returning the profile fields plus entries and images, so the public page needs one call and no direct table exposure.
- `RegistrarProfile.tsx` extended to render the new sections and reuse `ImageLightbox` for project photos.
- New `src/pages/RegistrarPresentation.tsx` editor plus route `/registrar/presentation`, linked from the registrar dashboard, replacing the "Edit" link that currently points at the application form.
- Grants for both new tables to authenticated and anon, following the existing pattern.
