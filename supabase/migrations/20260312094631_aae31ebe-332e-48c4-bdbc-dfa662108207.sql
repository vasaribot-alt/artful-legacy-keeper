
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('exhibition-images', 'exhibition-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('exhibition-documents', 'exhibition-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('catalogue-covers', 'catalogue-covers', true) ON CONFLICT DO NOTHING;

-- Storage policies for exhibition-images (public read, auth upload/delete)
CREATE POLICY "Public can view exhibition images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'exhibition-images');
CREATE POLICY "Auth users can upload exhibition images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exhibition-images');
CREATE POLICY "Auth users can delete own exhibition images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'exhibition-images');

-- Storage policies for exhibition-documents (auth only)
CREATE POLICY "Auth users can view exhibition documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'exhibition-documents');
CREATE POLICY "Auth users can upload exhibition documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exhibition-documents');
CREATE POLICY "Auth users can delete exhibition documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'exhibition-documents');

-- Storage policies for catalogue-covers (public read, auth upload/delete)
CREATE POLICY "Public can view catalogue covers" ON storage.objects FOR SELECT TO public USING (bucket_id = 'catalogue-covers');
CREATE POLICY "Auth users can upload catalogue covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'catalogue-covers');
CREATE POLICY "Auth users can delete catalogue covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'catalogue-covers');
