CREATE POLICY "Users can update own exhibition images"
ON public.exhibition_images
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM exhibitions
  WHERE exhibitions.id = exhibition_images.exhibition_id
  AND exhibitions.user_id = auth.uid()
));