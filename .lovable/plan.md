# Collection Management Upgrade — Plan

Three connected upgrades to the **collector** role context. Nothing here changes the artist experience.

---

## 1. Richer values / valuation fields

Extend `artworks` with dedicated price fields so a collector can track cost, insurance and market value separately instead of the single `price` we have today.

**New fields** (all nullable, currency stays on the existing currency column):

| Group | Field | Purpose |
|---|---|---|
| Cost | `purchase_price` | Actual amount paid |
| Cost | `original_retail_price` | MSRP at launch |
| Cost | `acquisition_cost` | Total incl. tax / shipping / premiums |
| Market | `current_market_value` | Today's open-market avg |
| Market | `estimated_value` | Personal / expert estimate |
| Market | `appraised_value` + `appraised_at` + `appraised_by` | Certified appraisal |
| Market | `last_sold_price` + `last_sold_at` | Most recent public sale of identical item |
| Insurance | `replacement_value` | For insurance |
| Sale | `reserve_price` | Minimum accepted if selling |
| Restoration | `restoration_cost` | Cumulative conservation spend |

In the collector Artwork form, group these under a collapsible **"Valuation & costs"** section. The artist role never sees this section.

Also add **"Consider selling"** as a third status alongside Available / Sold. Inventory filters and badges get the new option.

---

## 2. Better location overview

Today `artwork_location` is a free-text field plus a `artwork_location_history` log. Upgrade to a structured hierarchy while keeping the free-text field for backward compatibility.

**New structured fields on `artworks`** (collector context):
- `location_facility` (e.g. "Main residence", "Storage Amsterdam")
- `location_room`
- `location_cabinet`
- `location_shelf`
- `location_box`
- `env_temperature_note`, `env_humidity_note`, `env_light_note` (short text)
- `hazard_notes` (fragile / toxic / handling)

**Movement history**: extend existing `artwork_location_history` with:
- `moved_by` (uuid, auto = auth.uid)
- `reason` (enum-ish text: "conservation", "loan", "exhibition", "storage move", "other")
- Structured `to_facility` / `to_room` etc. — so an entry both updates the current location fields and writes an audit row atomically via a button "Record move".

**Inventory page** gets a new **grouping by facility → room** view and a location tree summary at the top ("3 facilities · 8 rooms · 42 works").

---

## 3. Lending-to-museums flag

Simplest possible v1 per your note: a single Yes/No on the collector profile.

- Add `willing_to_lend` boolean + optional `lending_notes` (text, e.g. "EU only, min 3 months notice") on `profiles` — collector role.
- Surface as a toggle in **Profile → Collector settings**.
- Add a small public-facing badge "🏛 Open to museum loans" on the collector's public profile when true.
- Foundation dashboard gets a filterable **"Collectors open to lending"** list (name, city, count of works, contact) so museums can be pointed there in future. No outreach messaging yet.

---

## Technical notes

- One migration adds all `artworks` columns, the profile fields, and extra `artwork_location_history` columns. All nullable, no data backfill needed.
- Status enum stays as free text (`available` | `sold` | `considering`) to avoid enum migration friction.
- All new UI lives behind `role_context = 'collector'` checks — artist views untouched.
- Public collector-lending visibility uses the same RLS SELECT pattern already used for Founding Artists.

---

## Out of scope for this pass (can follow later)
- In-app museum → collector loan-request messaging
- Automated market-value lookups
- Insurance document generation
- Environmental sensor integrations

Shall I proceed?
