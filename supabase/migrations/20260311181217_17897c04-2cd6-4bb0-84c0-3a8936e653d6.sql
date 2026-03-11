
-- Catalogues table
CREATE TABLE public.catalogues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  publication_year INTEGER,
  publisher TEXT,
  authors TEXT,
  isbn TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalogues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own catalogues" ON public.catalogues FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own catalogues" ON public.catalogues FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own catalogues" ON public.catalogues FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own catalogues" ON public.catalogues FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Junction table linking artworks to catalogues
CREATE TABLE public.artwork_catalogues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  catalogue_id UUID NOT NULL REFERENCES public.catalogues(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artwork_id, catalogue_id)
);

ALTER TABLE public.artwork_catalogues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view artwork catalogues" ON public.artwork_catalogues FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_catalogues.artwork_id AND artworks.owner_id = auth.uid()));
CREATE POLICY "Owners can insert artwork catalogues" ON public.artwork_catalogues FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_catalogues.artwork_id AND artworks.owner_id = auth.uid()));
CREATE POLICY "Owners can delete artwork catalogues" ON public.artwork_catalogues FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_catalogues.artwork_id AND artworks.owner_id = auth.uid()));
