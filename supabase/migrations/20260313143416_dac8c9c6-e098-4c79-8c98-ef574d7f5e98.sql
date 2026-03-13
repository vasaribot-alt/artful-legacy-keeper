
-- Add columns to registrar_access for two-way access flow
ALTER TABLE public.registrar_access 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS requested_by text NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS message text;

-- Update existing rows to 'approved' status
UPDATE public.registrar_access SET status = 'approved' WHERE status = 'pending';

-- Change default back to pending for new rows (the UPDATE above was just for existing data)
-- Already set as default 'pending' which is correct for new requests

-- Create a security definer function to check registrar access
CREATE OR REPLACE FUNCTION public.has_registrar_access(_registrar_id uuid, _owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registrar_access
    WHERE registrar_id = _registrar_id
      AND owner_id = _owner_id
      AND status = 'approved'
  )
$$;

-- Add RLS policy: Registrars can view access requests they created
CREATE POLICY "Registrars can insert access requests"
ON public.registrar_access
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = registrar_id AND requested_by = 'registrar');

-- Owners can update (approve/reject) access requests
CREATE POLICY "Owners can update registrar access"
ON public.registrar_access
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

-- Allow registrars to see profiles of owners they have approved access to
CREATE POLICY "Registrars can view granted owner profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_registrar_access(auth.uid(), user_id));

-- Registrar RLS for exhibitions
CREATE POLICY "Registrars can view granted exhibitions"
ON public.exhibitions FOR SELECT TO authenticated
USING (public.has_registrar_access(auth.uid(), user_id));

CREATE POLICY "Registrars can insert for granted exhibitions"
ON public.exhibitions FOR INSERT TO authenticated
WITH CHECK (public.has_registrar_access(auth.uid(), user_id));

CREATE POLICY "Registrars can update granted exhibitions"
ON public.exhibitions FOR UPDATE TO authenticated
USING (public.has_registrar_access(auth.uid(), user_id));

-- Registrar RLS for catalogues
CREATE POLICY "Registrars can view granted catalogues"
ON public.catalogues FOR SELECT TO authenticated
USING (public.has_registrar_access(auth.uid(), user_id));

CREATE POLICY "Registrars can insert for granted catalogues"
ON public.catalogues FOR INSERT TO authenticated
WITH CHECK (public.has_registrar_access(auth.uid(), user_id));

CREATE POLICY "Registrars can update granted catalogues"
ON public.catalogues FOR UPDATE TO authenticated
USING (public.has_registrar_access(auth.uid(), user_id));

-- Registrar RLS for cv_entries (via profile)
CREATE POLICY "Registrars can view granted cv entries"
ON public.cv_entries FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = cv_entries.profile_id 
    AND public.has_registrar_access(auth.uid(), profiles.user_id)
));

CREATE POLICY "Registrars can insert granted cv entries"
ON public.cv_entries FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = cv_entries.profile_id 
    AND public.has_registrar_access(auth.uid(), profiles.user_id)
));

CREATE POLICY "Registrars can update granted cv entries"
ON public.cv_entries FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = cv_entries.profile_id 
    AND public.has_registrar_access(auth.uid(), profiles.user_id)
));

-- Registrar RLS for exhibition_artworks
CREATE POLICY "Registrars can view granted exhibition artworks"
ON public.exhibition_artworks FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM exhibitions 
  WHERE exhibitions.id = exhibition_artworks.exhibition_id 
    AND public.has_registrar_access(auth.uid(), exhibitions.user_id)
));

CREATE POLICY "Registrars can insert granted exhibition artworks"
ON public.exhibition_artworks FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM exhibitions 
  WHERE exhibitions.id = exhibition_artworks.exhibition_id 
    AND public.has_registrar_access(auth.uid(), exhibitions.user_id)
));

-- Registrar RLS for exhibition_images
CREATE POLICY "Registrars can view granted exhibition images"
ON public.exhibition_images FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM exhibitions 
  WHERE exhibitions.id = exhibition_images.exhibition_id 
    AND public.has_registrar_access(auth.uid(), exhibitions.user_id)
));

CREATE POLICY "Registrars can insert granted exhibition images"
ON public.exhibition_images FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM exhibitions 
  WHERE exhibitions.id = exhibition_images.exhibition_id 
    AND public.has_registrar_access(auth.uid(), exhibitions.user_id)
));

-- Registrar RLS for exhibition_documents
CREATE POLICY "Registrars can view granted exhibition documents"
ON public.exhibition_documents FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM exhibitions 
  WHERE exhibitions.id = exhibition_documents.exhibition_id 
    AND public.has_registrar_access(auth.uid(), exhibitions.user_id)
));

CREATE POLICY "Registrars can insert granted exhibition documents"
ON public.exhibition_documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM exhibitions 
  WHERE exhibitions.id = exhibition_documents.exhibition_id 
    AND public.has_registrar_access(auth.uid(), exhibitions.user_id)
));

-- Registrar RLS for artwork_images
CREATE POLICY "Registrars can view granted artwork images"
ON public.artwork_images FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM artworks 
  WHERE artworks.id = artwork_images.artwork_id 
    AND public.has_registrar_access(auth.uid(), artworks.owner_id)
));

CREATE POLICY "Registrars can insert granted artwork images"
ON public.artwork_images FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM artworks 
  WHERE artworks.id = artwork_images.artwork_id 
    AND public.has_registrar_access(auth.uid(), artworks.owner_id)
));

-- Registrar RLS for artwork_documents
CREATE POLICY "Registrars can view granted artwork documents"
ON public.artwork_documents FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM artworks 
  WHERE artworks.id = artwork_documents.artwork_id 
    AND public.has_registrar_access(auth.uid(), artworks.owner_id)
));

CREATE POLICY "Registrars can insert granted artwork documents"
ON public.artwork_documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM artworks 
  WHERE artworks.id = artwork_documents.artwork_id 
    AND public.has_registrar_access(auth.uid(), artworks.owner_id)
));

-- Registrar RLS for artwork_catalogues
CREATE POLICY "Registrars can view granted artwork catalogues"
ON public.artwork_catalogues FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM artworks 
  WHERE artworks.id = artwork_catalogues.artwork_id 
    AND public.has_registrar_access(auth.uid(), artworks.owner_id)
));

CREATE POLICY "Registrars can insert granted artwork catalogues"
ON public.artwork_catalogues FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM artworks 
  WHERE artworks.id = artwork_catalogues.artwork_id 
    AND public.has_registrar_access(auth.uid(), artworks.owner_id)
));

-- Registrar RLS for artwork_exhibitions
CREATE POLICY "Registrars can view granted artwork exhibitions"
ON public.artwork_exhibitions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM artworks 
  WHERE artworks.id = artwork_exhibitions.artwork_id 
    AND public.has_registrar_access(auth.uid(), artworks.owner_id)
));

CREATE POLICY "Registrars can insert granted artwork exhibitions"
ON public.artwork_exhibitions FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM artworks 
  WHERE artworks.id = artwork_exhibitions.artwork_id 
    AND public.has_registrar_access(auth.uid(), artworks.owner_id)
));

-- Registrar RLS for series_groups
CREATE POLICY "Registrars can view granted series"
ON public.series_groups FOR SELECT TO authenticated
USING (public.has_registrar_access(auth.uid(), user_id));

CREATE POLICY "Registrars can insert granted series"
ON public.series_groups FOR INSERT TO authenticated
WITH CHECK (public.has_registrar_access(auth.uid(), user_id));

-- Registrar RLS for portfolios
CREATE POLICY "Registrars can view granted portfolios"
ON public.portfolios FOR SELECT TO authenticated
USING (public.has_registrar_access(auth.uid(), user_id));
