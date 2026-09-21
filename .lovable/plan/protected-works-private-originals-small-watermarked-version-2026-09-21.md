# Protected works: private originals, small watermarked version in public

For artists whose works are digital — where the file *is* the work — full-size images should never leave the archive. The public sees a small watermarked version only. Everything else (title, year, medium, GAWID, provenance, exhibitions) stays fully documented and public as today.

## How it works for the artist

- Each work gets a setting: **Protect this work** (off by default).
- When switched on:
  - The full image is kept in the archive and is only visible to the artist, their registrar, and the foundation.
  - Public pages (artist website, public profile, catalogue raisonné pages, shared portfolios, link previews) show a small watermarked version, roughly 700 px on the longest side, with the artist's name and GAWID printed across it.
  - Right-click saving, dragging and the full-screen zoom are disabled for that work, and a short line reads "Protected work — full image held in the archive."
- A single switch in the artist's profile: **Protect all my works by default**, so a digital artist sets it once and every new upload is protected.
- The artist can still download their own originals at any time.

## What the public sees

A protected work looks complete: image (small, watermarked), full title, year, medium, dimensions, edition, GAWID, exhibition history. Only the high-resolution file is withheld.

## Honest limits, stated in the interface

Anything shown in a browser can be screen-captured, and AI crawlers can read what is public. This makes the exposure small and traceable — a watermarked 700 px file — rather than preventing copying outright. The interface will say exactly that, so nobody is misled.

## Technical outline

- `artworks.protected_display boolean default false`; `profiles.protect_new_artworks boolean default false` applied on artwork insert.
- `artwork_images.protected_storage_path text` for the watermarked derivative.
- New public bucket `artwork-images-protected` (watermarked derivatives only, safe to be public).
- Make the originals bucket `artwork-images` non-public and add owner/registrar/foundation read policies; owner-facing views switch from `getPublicUrl` to signed URLs via a shared helper.
- `artwork-images-web` (max 2000 px derivative) stays public for unprotected works; for protected works its derivative is deleted and replaced by the watermarked one.
- New edge function `protect-image`: downloads the original with the service role, draws a max-700 px JPEG with a tiled semi-transparent watermark (artist name + GAWID) via OffscreenCanvas, uploads to the protected bucket, records the path. Runs when protection is switched on and on every upload for a protected work; removes the 2000 px web file in the same step.
- New security-definer RPC `get_public_artwork_images(_artwork_ids uuid[])` returning, per image, only the path the public is allowed to see. Public pages (`ArtistSite`, `PublicArtistProfile`, CR pages, shared portfolios, `site-preview`) read image paths through it instead of selecting `artwork_images` directly, so a protected work's original path is never exposed in a row.
- Public SELECT policies on `artwork_images` tightened so protected works' `storage_path` / `web_storage_path` are not readable anonymously.
- Switching protection off restores the normal web derivative.

## Backfill

Existing works stay unprotected; nothing changes until an artist switches it on. Switching the profile-level default on offers "apply to all my existing works", which queues the derivative job for each work.
