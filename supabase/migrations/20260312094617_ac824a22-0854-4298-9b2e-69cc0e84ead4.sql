
-- 1. New exhibitions table
CREATE TABLE public.exhibitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  exhibition_type text NOT NULL DEFAULT 'solo',
  opening_date date NULL,
  closing_date date NULL,
  venue text NULL,
  city text NULL,
  country text NULL,
  curator text NULL,
  artists text NULL,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exhibitions" ON public.exhibitions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exhibitions" ON public.exhibitions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exhibitions" ON public.exhibitions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own exhibitions" ON public.exhibitions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Exhibition images
CREATE TABLE public.exhibition_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibition_id uuid NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  caption text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exhibition_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exhibition images" ON public.exhibition_images FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exhibitions WHERE exhibitions.id = exhibition_images.exhibition_id AND exhibitions.user_id = auth.uid()));
CREATE POLICY "Users can insert own exhibition images" ON public.exhibition_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.exhibitions WHERE exhibitions.id = exhibition_images.exhibition_id AND exhibitions.user_id = auth.uid()));
CREATE POLICY "Users can delete own exhibition images" ON public.exhibition_images FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exhibitions WHERE exhibitions.id = exhibition_images.exhibition_id AND exhibitions.user_id = auth.uid()));

-- 3. Exhibition documents (press releases etc.)
CREATE TABLE public.exhibition_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibition_id uuid NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NULL,
  file_size bigint NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exhibition_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exhibition documents" ON public.exhibition_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exhibitions WHERE exhibitions.id = exhibition_documents.exhibition_id AND exhibitions.user_id = auth.uid()));
CREATE POLICY "Users can insert own exhibition documents" ON public.exhibition_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.exhibitions WHERE exhibitions.id = exhibition_documents.exhibition_id AND exhibitions.user_id = auth.uid()));
CREATE POLICY "Users can delete own exhibition documents" ON public.exhibition_documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exhibitions WHERE exhibitions.id = exhibition_documents.exhibition_id AND exhibitions.user_id = auth.uid()));

-- 4. Exhibition ↔ Artworks junction
CREATE TABLE public.exhibition_artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibition_id uuid NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exhibition_id, artwork_id)
);

ALTER TABLE public.exhibition_artworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exhibition artworks" ON public.exhibition_artworks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exhibitions WHERE exhibitions.id = exhibition_artworks.exhibition_id AND exhibitions.user_id = auth.uid()));
CREATE POLICY "Users can insert own exhibition artworks" ON public.exhibition_artworks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.exhibitions WHERE exhibitions.id = exhibition_artworks.exhibition_id AND exhibitions.user_id = auth.uid()));
CREATE POLICY "Users can delete own exhibition artworks" ON public.exhibition_artworks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exhibitions WHERE exhibitions.id = exhibition_artworks.exhibition_id AND exhibitions.user_id = auth.uid()));

-- 5. Add columns to catalogues
ALTER TABLE public.catalogues
  ADD COLUMN IF NOT EXISTS cover_image_path text NULL,
  ADD COLUMN IF NOT EXISTS language text NULL,
  ADD COLUMN IF NOT EXISTS page_count integer NULL;

-- 6. Add page_reference to artwork_catalogues
ALTER TABLE public.artwork_catalogues
  ADD COLUMN IF NOT EXISTS page_reference text NULL;
