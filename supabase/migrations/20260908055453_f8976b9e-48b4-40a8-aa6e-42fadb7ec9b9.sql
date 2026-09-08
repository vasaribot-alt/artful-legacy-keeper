DROP POLICY IF EXISTS "Anyone can view founding artist edition items" ON public.edition_items;
REVOKE SELECT ON public.edition_items FROM anon;