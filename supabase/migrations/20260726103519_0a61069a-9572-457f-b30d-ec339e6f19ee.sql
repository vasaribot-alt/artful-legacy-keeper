GRANT SELECT, INSERT, UPDATE, DELETE ON public.artworks TO authenticated;
GRANT SELECT ON public.artworks TO anon;
GRANT ALL ON public.artworks TO service_role;