
-- CV entries table - preserves artist's own section structure
CREATE TABLE public.cv_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section text NOT NULL DEFAULT '',
  entry_text text NOT NULL DEFAULT '',
  year text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cv_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cv entries" ON public.cv_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = cv_entries.profile_id AND profiles.user_id = auth.uid()));

CREATE POLICY "Users can insert own cv entries" ON public.cv_entries FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = cv_entries.profile_id AND profiles.user_id = auth.uid()));

CREATE POLICY "Users can update own cv entries" ON public.cv_entries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = cv_entries.profile_id AND profiles.user_id = auth.uid()));

CREATE POLICY "Users can delete own cv entries" ON public.cv_entries FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = cv_entries.profile_id AND profiles.user_id = auth.uid()));

-- CV entry images (for exhibition images etc.)
CREATE TABLE public.cv_entry_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_entry_id uuid NOT NULL REFERENCES public.cv_entries(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cv_entry_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cv entry images" ON public.cv_entry_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM cv_entries JOIN profiles ON profiles.id = cv_entries.profile_id
    WHERE cv_entries.id = cv_entry_images.cv_entry_id AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own cv entry images" ON public.cv_entry_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM cv_entries JOIN profiles ON profiles.id = cv_entries.profile_id
    WHERE cv_entries.id = cv_entry_images.cv_entry_id AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own cv entry images" ON public.cv_entry_images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM cv_entries JOIN profiles ON profiles.id = cv_entries.profile_id
    WHERE cv_entries.id = cv_entry_images.cv_entry_id AND profiles.user_id = auth.uid()
  ));

-- Storage bucket for cv entry images
INSERT INTO storage.buckets (id, name, public) VALUES ('cv-images', 'cv-images', true);

CREATE POLICY "Users can upload cv images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cv-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view cv images" ON storage.objects FOR SELECT
  USING (bucket_id = 'cv-images');

CREATE POLICY "Users can delete own cv images" ON storage.objects FOR DELETE
  USING (bucket_id = 'cv-images' AND auth.role() = 'authenticated');
