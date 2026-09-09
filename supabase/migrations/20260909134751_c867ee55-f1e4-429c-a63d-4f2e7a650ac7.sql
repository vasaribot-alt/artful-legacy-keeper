DROP POLICY IF EXISTS "Artists can view and respond to their own representation requests" ON public.gallery_artist_representations;

CREATE POLICY "Artists can view their own representation requests"
  ON public.gallery_artist_representations
  FOR SELECT TO authenticated
  USING (auth.uid() = artist_id);

CREATE POLICY "Artists can respond to their own representation requests"
  ON public.gallery_artist_representations
  FOR UPDATE TO authenticated
  USING (auth.uid() = artist_id)
  WITH CHECK (auth.uid() = artist_id AND status IN ('approved', 'declined', 'ended'));