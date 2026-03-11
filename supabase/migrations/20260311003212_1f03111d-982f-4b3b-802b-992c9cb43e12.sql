
CREATE TABLE public.artwork_exhibitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  cv_entry_id uuid NOT NULL REFERENCES public.cv_entries(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artwork_id, cv_entry_id)
);

ALTER TABLE public.artwork_exhibitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view artwork exhibitions"
ON public.artwork_exhibitions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.artworks WHERE artworks.id = artwork_exhibitions.artwork_id AND artworks.owner_id = auth.uid()
));

CREATE POLICY "Owners can insert artwork exhibitions"
ON public.artwork_exhibitions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.artworks WHERE artworks.id = artwork_exhibitions.artwork_id AND artworks.owner_id = auth.uid()
));

CREATE POLICY "Owners can delete artwork exhibitions"
ON public.artwork_exhibitions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.artworks WHERE artworks.id = artwork_exhibitions.artwork_id AND artworks.owner_id = auth.uid()
));
