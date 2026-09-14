# Artist Websites: a public website for every artist, hosted by GARF

Offer each artist a simple, elegant website generated from the records they already keep in GARF. Address `globalartistregistry.org/site/their-name`, with the option to point their own domain at it later. Free to build and turn on now; a one-off setup fee plus an annual fee applies once card payments are active. When the artist passes away, the site stays online as part of the preserved legacy record.

## What the artist gets

A standalone site with four pages, separate from the registry profile:

```text
globalartistregistry.org/site/jane-doe          Home (name, portrait, short intro)
globalartistregistry.org/site/jane-doe/works    Works grid, tap to view each work
globalartistregistry.org/site/jane-doe/about    Biography, portrait, CV summary
globalartistregistry.org/site/jane-doe/contact  Email, gallery contact, links
```

- Clean monochrome design matching the Foundation identity, serif name heading, generous white space
- All content pulled from the artist's existing GARF records (works, images, biography, CV, contact details), nothing entered twice
- The artist controls what shows: which works, whether email/phone appear, what goes on the About page
- A contact page following the advice we share: a real email address visible, not only a form

## What the artist manages

New "My Website" page in the artist dashboard (sidebar entry):

- Turn the website on/off with one switch
- Choose the address ending (their name slug), with a live preview of the address
- Pick the short intro line for the home page
- Choose which works appear (default: works marked available/public)
- About page text (default: their existing biography)
- Contact options: show email, show gallery contact, or neither
- Billing status panel, showing "Payments activate soon; your website stays free until then"

## Own domain (later phase)

- The artist registers or already owns their own domain (e.g. janedoe.com)
- They point it at GARF; our app detects the domain and serves their website on it
- Foundation role approves and connects each domain; the artist gets step-by-step instructions
- This phase adds the field and approval flow now, wiring it up when the first artist requests it

## Data and security

- New table `artist_websites`: owner, on/off, address slug (unique, validated), intro line, about override, contact choices, custom domain field (pending/approved), billing fields (dormant), timestamps
- Public read access limited to sites switched on, and only to the fields the site actually displays; private profile data stays private
- Works shown on the site respect the same public-image rules as the existing public profile

## Billing (dormant until Stripe activates)

- One-off setup fee plus annual fee; amounts set by Jan before launch
- Fields and status tracking built now; checkout connects to the existing donations/collector-access Stripe flow when the bank cards arrive
- Lifetime rule: the fee covers the artist's lifetime. On death, billing stops and the site remains as part of the preserved record (legacy mode, noted gently on the site)

## Rollout

1. Database table, policies, and public read rules
2. "My Website" dashboard page with settings and live address preview
3. The four public pages under `/site/:slug`
4. Custom domain field and Foundation approval flow (connection done manually per request)
5. When Stripe is live: checkout, receipts, and billing status
