GRANT SELECT ON public.galleries TO authenticated;
GRANT ALL ON public.galleries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_outreach TO authenticated;
GRANT ALL ON public.gallery_outreach TO service_role;