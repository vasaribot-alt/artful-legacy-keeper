
CREATE POLICY "Owners can update artwork images" ON public.artwork_images
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.artworks WHERE artworks.id = artwork_images.artwork_id AND artworks.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.artworks WHERE artworks.id = artwork_images.artwork_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Registrars can update granted artwork images" ON public.artwork_images
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.artworks WHERE artworks.id = artwork_images.artwork_id AND has_registrar_access(auth.uid(), artworks.owner_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.artworks WHERE artworks.id = artwork_images.artwork_id AND has_registrar_access(auth.uid(), artworks.owner_id)));
