# Artists choose what their website contains

Give every artist a clear set of choices when they set up their website, so the site shows only what they want, and so we learn what artists actually ask for.

## Basic (always included)

- About with biography
- Choice of works
- Contacts: the artist's own contacts with social media, plus gallery contacts

These stay as they are today, presented in the settings as the included basics.

## Advanced (each one optional, off by default)

- CV
  - Web presentation, built from the CV the artist already keeps here
  - Downloadable PDF, generated from the same CV
- Exhibitions
  - Solo
  - Group
  - Upcoming
  Each type can be switched on separately.
- Publications (catalogues the artist has recorded)
- News: short dated posts the artist writes on their website page

Each choice adds a matching page and a link in the website menu. Nothing switched on means nothing shown, exactly as now.

## Learning what artists want

A simple overview in the Foundation area showing how many artists switched each option on, so we can see which additions matter most.

## Technical notes

- Add a `sections` JSON column to `artist_websites` (cv_web, cv_pdf, exh_solo, exh_group, exh_upcoming, publications, news), defaulting to all off so existing sites are unchanged. Extend `get_artist_site` to return it.
- New `artist_news` table (owner, title, body, date, optional image, published flag) with owner-only write policies and public read limited to published posts of enabled websites, plus GRANTs.
- Public pages read from the existing CV entries, exhibitions and catalogues records; exhibition type filters use the existing solo/group tag and dates for upcoming.
- CV PDF generated in the browser from the same CV data, so no storage is needed.
- Website menu and routes become driven by the enabled sections.

## Verification

- Existing websites look identical until the artist enables something.
- Each enabled section shows its page and menu link; empty data shows a quiet placeholder rather than a broken page.
- Check on desktop and mobile, and confirm the counts overview matches the settings.
