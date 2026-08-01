UPDATE public.alliance_outreach_targets
SET
  tag = 'us_partner',
  notes = COALESCE(NULLIF(notes, ''), '') || E'\n\nStrategic US partner opportunity: IFAR is winding down operations, making this an ideal moment to propose GARF as the digital successor to IFAR''s provenance research, scholarly standards, and public-education mission. Pitch should emphasize continuity of mission, adoption of provenance best practices, and transfer of institutional relationships to a global, non-profit 100-year preservation infrastructure.'
WHERE id = '478d3c8d-9643-4c42-862c-ffac05119085';