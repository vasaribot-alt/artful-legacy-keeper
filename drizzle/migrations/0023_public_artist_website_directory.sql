CREATE OR REPLACE FUNCTION public.list_public_artist_websites()
RETURNS TABLE (full_name text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT btrim(p.full_name), w.slug
  FROM public.artist_websites w
  JOIN public.profiles p ON p.user_id = w.user_id
  WHERE w.is_enabled = true
    AND nullif(btrim(p.full_name), '') IS NOT NULL
    AND nullif(btrim(w.slug), '') IS NOT NULL
  ORDER BY lower(btrim(p.full_name)), w.slug;
$$;
REVOKE ALL ON FUNCTION public.list_public_artist_websites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_artist_websites() TO anon, authenticated, service_role;