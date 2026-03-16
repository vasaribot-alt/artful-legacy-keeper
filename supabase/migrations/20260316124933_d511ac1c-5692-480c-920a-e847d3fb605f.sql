CREATE POLICY "Anyone can view founding artist cv entries"
ON public.cv_entries
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN founding_artists fa ON fa.user_id = p.user_id
    WHERE p.id = cv_entries.profile_id
  )
)