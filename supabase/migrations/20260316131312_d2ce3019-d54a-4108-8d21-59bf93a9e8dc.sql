
-- Public can view exhibitions belonging to founding artists
CREATE POLICY "Anyone can view founding artist exhibitions"
ON public.exhibitions FOR SELECT TO public
USING (EXISTS (
  SELECT 1 FROM founding_artists WHERE founding_artists.user_id = exhibitions.user_id
));

-- Public can view exhibition images for founding artists
CREATE POLICY "Anyone can view founding artist exhibition images"
ON public.exhibition_images FOR SELECT TO public
USING (EXISTS (
  SELECT 1 FROM exhibitions
  JOIN founding_artists ON founding_artists.user_id = exhibitions.user_id
  WHERE exhibitions.id = exhibition_images.exhibition_id
));

-- Public can view series_groups for founding artists
CREATE POLICY "Anyone can view founding artist series"
ON public.series_groups FOR SELECT TO public
USING (EXISTS (
  SELECT 1 FROM founding_artists WHERE founding_artists.user_id = series_groups.user_id
));

-- Public can view artworks belonging to founding artists
CREATE POLICY "Anyone can view founding artist artworks"
ON public.artworks FOR SELECT TO public
USING (EXISTS (
  SELECT 1 FROM founding_artists WHERE founding_artists.user_id = artworks.owner_id
));

-- Public can view artwork images for founding artists
CREATE POLICY "Anyone can view founding artist artwork images"
ON public.artwork_images FOR SELECT TO public
USING (EXISTS (
  SELECT 1 FROM artworks
  JOIN founding_artists ON founding_artists.user_id = artworks.owner_id
  WHERE artworks.id = artwork_images.artwork_id
));
