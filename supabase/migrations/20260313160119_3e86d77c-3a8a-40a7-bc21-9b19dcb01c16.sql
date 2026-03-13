-- Allow registrars to delete artworks for their granted clients
CREATE POLICY "Registrars can delete for granted owners"
ON public.artworks
FOR DELETE
TO authenticated
USING (has_registrar_access(auth.uid(), owner_id));

-- Allow registrars to delete artwork images for granted clients
CREATE POLICY "Registrars can delete granted artwork images"
ON public.artwork_images
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM artworks
  WHERE artworks.id = artwork_images.artwork_id
    AND has_registrar_access(auth.uid(), artworks.owner_id)
));

-- Allow registrars to delete artwork documents for granted clients
CREATE POLICY "Registrars can delete granted artwork documents"
ON public.artwork_documents
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM artworks
  WHERE artworks.id = artwork_documents.artwork_id
    AND has_registrar_access(auth.uid(), artworks.owner_id)
));

-- Allow registrars to delete artwork exhibitions for granted clients
CREATE POLICY "Registrars can delete granted artwork exhibitions"
ON public.artwork_exhibitions
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM artworks
  WHERE artworks.id = artwork_exhibitions.artwork_id
    AND has_registrar_access(auth.uid(), artworks.owner_id)
));

-- Allow registrars to delete artwork catalogues for granted clients
CREATE POLICY "Registrars can delete granted artwork catalogues"
ON public.artwork_catalogues
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM artworks
  WHERE artworks.id = artwork_catalogues.artwork_id
    AND has_registrar_access(auth.uid(), artworks.owner_id)
));