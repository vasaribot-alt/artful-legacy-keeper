
-- Table for photography size variants (e.g., 40x40, 60x60, 80x80, 100x100)
CREATE TABLE public.artwork_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  size_label TEXT NOT NULL, -- A, B, C, D...
  height NUMERIC,
  width NUMERIC,
  edition_count INTEGER NOT NULL DEFAULT 1,
  artist_proofs INTEGER NOT NULL DEFAULT 0,
  price NUMERIC,
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (artwork_id, size_label)
);

-- Table for individual edition items (each trackable with provenance)
CREATE TABLE public.edition_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_size_id UUID NOT NULL REFERENCES public.artwork_sizes(id) ON DELETE CASCADE,
  edition_label TEXT NOT NULL, -- "1", "2", ... "1AP", "2AP"
  is_ap BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'available',
  buyer_name TEXT,
  sold_date DATE,
  artwork_location TEXT,
  provenance TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (artwork_size_id, edition_label)
);

-- Enable RLS
ALTER TABLE public.artwork_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edition_items ENABLE ROW LEVEL SECURITY;

-- RLS for artwork_sizes: owner access via artworks join
CREATE POLICY "Owners can view own artwork sizes"
  ON public.artwork_sizes FOR SELECT
  USING (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_sizes.artwork_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can insert own artwork sizes"
  ON public.artwork_sizes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_sizes.artwork_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can update own artwork sizes"
  ON public.artwork_sizes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_sizes.artwork_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can delete own artwork sizes"
  ON public.artwork_sizes FOR DELETE
  USING (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_sizes.artwork_id AND artworks.owner_id = auth.uid()));

-- RLS for edition_items: owner access via artwork_sizes -> artworks join
CREATE POLICY "Owners can view own edition items"
  ON public.edition_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM artwork_sizes JOIN artworks ON artworks.id = artwork_sizes.artwork_id WHERE artwork_sizes.id = edition_items.artwork_size_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can insert own edition items"
  ON public.edition_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM artwork_sizes JOIN artworks ON artworks.id = artwork_sizes.artwork_id WHERE artwork_sizes.id = edition_items.artwork_size_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can update own edition items"
  ON public.edition_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM artwork_sizes JOIN artworks ON artworks.id = artwork_sizes.artwork_id WHERE artwork_sizes.id = edition_items.artwork_size_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can delete own edition items"
  ON public.edition_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM artwork_sizes JOIN artworks ON artworks.id = artwork_sizes.artwork_id WHERE artwork_sizes.id = edition_items.artwork_size_id AND artworks.owner_id = auth.uid()));

-- Registrar access for artwork_sizes
CREATE POLICY "Registrars can view granted artwork sizes"
  ON public.artwork_sizes FOR SELECT
  USING (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_sizes.artwork_id AND has_registrar_access(auth.uid(), artworks.owner_id)));

CREATE POLICY "Registrars can insert granted artwork sizes"
  ON public.artwork_sizes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_sizes.artwork_id AND has_registrar_access(auth.uid(), artworks.owner_id)));

CREATE POLICY "Registrars can update granted artwork sizes"
  ON public.artwork_sizes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_sizes.artwork_id AND has_registrar_access(auth.uid(), artworks.owner_id)));

-- Registrar access for edition_items
CREATE POLICY "Registrars can view granted edition items"
  ON public.edition_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM artwork_sizes JOIN artworks ON artworks.id = artwork_sizes.artwork_id WHERE artwork_sizes.id = edition_items.artwork_size_id AND has_registrar_access(auth.uid(), artworks.owner_id)));

CREATE POLICY "Registrars can insert granted edition items"
  ON public.edition_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM artwork_sizes JOIN artworks ON artworks.id = artwork_sizes.artwork_id WHERE artwork_sizes.id = edition_items.artwork_size_id AND has_registrar_access(auth.uid(), artworks.owner_id)));

CREATE POLICY "Registrars can update granted edition items"
  ON public.edition_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM artwork_sizes JOIN artworks ON artworks.id = artwork_sizes.artwork_id WHERE artwork_sizes.id = edition_items.artwork_size_id AND has_registrar_access(auth.uid(), artworks.owner_id)));

-- Public view for founding artists
CREATE POLICY "Anyone can view founding artist artwork sizes"
  ON public.artwork_sizes FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM artworks JOIN founding_artists ON founding_artists.user_id = artworks.owner_id WHERE artworks.id = artwork_sizes.artwork_id));

CREATE POLICY "Anyone can view founding artist edition items"
  ON public.edition_items FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM artwork_sizes JOIN artworks ON artworks.id = artwork_sizes.artwork_id JOIN founding_artists ON founding_artists.user_id = artworks.owner_id WHERE artwork_sizes.id = edition_items.artwork_size_id));

-- Trigger for updated_at on edition_items
CREATE TRIGGER update_edition_items_updated_at
  BEFORE UPDATE ON public.edition_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
