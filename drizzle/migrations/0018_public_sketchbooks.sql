ALTER TABLE public.sketchbooks ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
GRANT SELECT ON public.sketchbooks TO anon;
CREATE POLICY "Public sketchbooks readable" ON public.sketchbooks FOR SELECT TO anon, authenticated USING (is_public AND role_context = 'artist');
CREATE OR REPLACE FUNCTION public.guard_sketchbook_publication() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_public IS DISTINCT FROM (CASE WHEN TG_OP = 'INSERT' THEN false ELSE OLD.is_public END)
     AND auth.uid() IS DISTINCT FROM NEW.owner_id THEN
    RAISE EXCEPTION 'Only the artist may change sketchbook visibility';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_sketchbook_publication BEFORE INSERT OR UPDATE ON public.sketchbooks FOR EACH ROW EXECUTE FUNCTION public.guard_sketchbook_publication();
CREATE POLICY "Public sketchbook PDFs read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'sketchbooks' AND EXISTS (SELECT 1 FROM public.sketchbooks s WHERE s.pdf_path = storage.objects.name AND s.is_public));