- Keep the nine principal public pages on the shared PublicHeader, with one ordered link list and a compact menu below wide desktop; this prevents public navigation drift without changing signed-in workspace navigation.
- Use PublicPageHero for the nine public menu destinations; one shared About-based type scale and spacing keeps their page introductions aligned.

- Unclaimed works live in `orphan_artworks` (bulk DB), never in `artworks`: works move to an artist catalogue only via the artist claim flow (OrphanClaimsCard), preserving the artist-consent principle.
- The active workspace role in localStorage is tied to the signed-in user id (activeRoleUser) and reset when a different account signs in; prevents one account role leaking into another on a shared browser.
