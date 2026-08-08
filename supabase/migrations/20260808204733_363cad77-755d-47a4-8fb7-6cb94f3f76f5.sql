-- Artworks: hide financial + physical security fields from anonymous visitors
REVOKE SELECT (
  purchase_price,
  original_retail_price,
  acquisition_cost,
  current_market_value,
  estimated_value,
  appraised_value,
  appraised_at,
  appraised_by,
  last_sold_price,
  last_sold_at,
  replacement_value,
  reserve_price,
  restoration_cost,
  location_facility,
  location_room,
  location_cabinet,
  location_shelf,
  location_box,
  env_temperature_note,
  env_humidity_note,
  env_light_note,
  hazard_notes,
  decline_reason
) ON public.artworks FROM anon;

-- Edition items: hide sale/ownership fields from anonymous visitors
REVOKE SELECT (
  buyer_name,
  sold_date,
  artwork_location,
  provenance
) ON public.edition_items FROM anon;