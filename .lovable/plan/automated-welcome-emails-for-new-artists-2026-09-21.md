# Automated welcome emails for new artists

Every new artist gets a welcome email prepared for them automatically. The system looks for their own website, writes the letter, and puts it in front of you to read and send with one click. Nothing goes out without your approval.

## What happens when someone registers

1. The account is created as today.
2. A welcome letter is queued for that person.
3. In the background we search for their own website (name, email domain, city) and note what the site appears to contain: works, CV, exhibitions, contact details.
4. A ready letter appears in your foundation dashboard under "Welcome letters", with the website finding already written into it.

## What you do

A new "Welcome letters" section in the foundation dashboard, next to "Getting started":

- One row per new artist: name, email, when they joined, and the website we found (or "no website found")
- "Read and send" opens the letter, fully editable
- Buttons: Send, Save for later, Skip (no letter for this person)
- After sending, the row shows "Sent" with the date, so nobody is written to twice
- Re-run the website search on a single person if you want another look

## What the letter says

Written in your voice, the same shape as the letters to Anni and Oliver, with four things woven in:

1. **A shortcut for filling in the archive.** The Research page: paste your website address and it gathers biography, CV and works into a review list you approve item by item. When no website was found, this paragraph changes to an offer of personal help entering the CV and works.
2. **Their own website through GARF.** A public artist website at globalartistregistry.org/site/their-name, switched on and managed from their own dashboard, with the works, CV, exhibitions and contact details they choose.
3. **Their own domain.** When we found a domain of their own, the letter tells them they can point it at the GARF website so their own address serves it. When we found none, it tells them they get an address through us at no cost.
4. **Heirs and the estate.** They can name who inherits their archive. Nothing changes while they are alive; when the time comes the foundation confirms the handover and the named heir gets full management of the record, with the estate shown publicly as custodian.

Each paragraph closes with an invitation to simply reply for personal help.

## Also in this change

The "Getting started" table shows the website we found for each artist as a link, instead of only whether their GARF website is switched on, so you can see at a glance who has material ready to import.

## Technical notes

- New table `welcome_letters`: user_id, status (queued / drafted / sent / skipped), discovered_website, website_findings (jsonb: has_cv, has_works, has_exhibitions, notes), subject, body, drafted_at, sent_at, sent_by. Foundation-only read and write through RLS; grants for authenticated and service_role.
- `handle_new_user()` also inserts a `welcome_letters` row with status `queued` for artist signups.
- New edge function `prepare-welcome-letter`: takes a user id, runs the website lookup through the Lovable AI gateway (google/gemini-2.5-flash, same pattern as `gallery-lookup`, empty strings when uncertain), composes subject and body from the four sections above, stores them on the row as `drafted`. Foundation-gated by role check on the caller's JWT.
- New edge function `send-welcome-letter`: foundation-gated, sends the stored subject and body through `sendRawEmail` (label `welcome_letter`, reply-to outreach@globalartistregistry.org, idempotency key from the row id), then marks the row `sent`.
- New component `WelcomeLetters.tsx` in the foundation dashboard: list, editor dialog, Send / Save / Skip / re-run lookup.
- `get_onboarding_progress()` extended with the discovered website so the tracker can show it.
