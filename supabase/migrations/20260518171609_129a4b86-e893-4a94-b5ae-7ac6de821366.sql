
-- IFAR-style CR scholarly fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_country text,
  ADD COLUMN IF NOT EXISTS death_country text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS period_activity_start int,
  ADD COLUMN IF NOT EXISTS period_activity_end int,
  ADD COLUMN IF NOT EXISTS cr_listed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cr_status text,
  ADD COLUMN IF NOT EXISTS cr_scope text,
  ADD COLUMN IF NOT EXISTS cr_compilers text,
  ADD COLUMN IF NOT EXISTS cr_sponsor text,
  ADD COLUMN IF NOT EXISTS cr_contact_email text,
  ADD COLUMN IF NOT EXISTS cr_website_url text,
  ADD COLUMN IF NOT EXISTS cr_first_volume_year int,
  ADD COLUMN IF NOT EXISTS cr_publisher text,
  ADD COLUMN IF NOT EXISTS cr_isbn text;

-- Public read for CR-listed artists
DROP POLICY IF EXISTS "Anyone can view CR-listed profiles" ON public.profiles;
CREATE POLICY "Anyone can view CR-listed profiles"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (cr_listed = true);

-- Public read for cv_entries of CR-listed artists
DROP POLICY IF EXISTS "Anyone can view CR-listed cv entries" ON public.cv_entries;
CREATE POLICY "Anyone can view CR-listed cv entries"
  ON public.cv_entries
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = cv_entries.profile_id AND p.cr_listed = true
  ));

-- Public read for artworks (verified only) of CR-listed artists
DROP POLICY IF EXISTS "Anyone can view CR-listed artworks" ON public.artworks;
CREATE POLICY "Anyone can view CR-listed artworks"
  ON public.artworks
  FOR SELECT
  TO anon, authenticated
  USING (
    verification_status = 'verified'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = artworks.owner_id AND p.cr_listed = true
    )
  );

-- Public read for artwork_images of CR-listed artists
DROP POLICY IF EXISTS "Anyone can view CR-listed artwork images" ON public.artwork_images;
CREATE POLICY "Anyone can view CR-listed artwork images"
  ON public.artwork_images
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.artworks a
    JOIN public.profiles p ON p.user_id = a.owner_id
    WHERE a.id = artwork_images.artwork_id
      AND a.verification_status = 'verified'
      AND p.cr_listed = true
  ));
