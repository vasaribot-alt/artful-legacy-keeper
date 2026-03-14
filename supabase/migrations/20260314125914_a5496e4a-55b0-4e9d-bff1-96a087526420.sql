
-- Add status column to artworks
ALTER TABLE public.artworks ADD COLUMN status text NOT NULL DEFAULT 'available';

-- Create artwork location history table
CREATE TABLE public.artwork_location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  location text NOT NULL,
  moved_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artwork_location_history ENABLE ROW LEVEL SECURITY;

-- RLS policies: owners can CRUD via artwork ownership
CREATE POLICY "Owners can view location history"
  ON public.artwork_location_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_location_history.artwork_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can insert location history"
  ON public.artwork_location_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_location_history.artwork_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can update location history"
  ON public.artwork_location_history FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_location_history.artwork_id AND artworks.owner_id = auth.uid()));

CREATE POLICY "Owners can delete location history"
  ON public.artwork_location_history FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_location_history.artwork_id AND artworks.owner_id = auth.uid()));

-- Registrar policies
CREATE POLICY "Registrars can view granted location history"
  ON public.artwork_location_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_location_history.artwork_id AND has_registrar_access(auth.uid(), artworks.owner_id)));

CREATE POLICY "Registrars can insert granted location history"
  ON public.artwork_location_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM artworks WHERE artworks.id = artwork_location_history.artwork_id AND has_registrar_access(auth.uid(), artworks.owner_id)));
