GRANT SELECT ON public.exhibitions TO anon;
GRANT SELECT ON public.catalogues TO anon;
GRANT SELECT ON public.cv_entries TO anon;

CREATE POLICY "Published website exhibitions are public"
  ON public.exhibitions FOR SELECT TO anon, authenticated
  USING (public.has_published_artist_site(user_id));

CREATE POLICY "Published website catalogues are public"
  ON public.catalogues FOR SELECT TO anon, authenticated
  USING (public.has_published_artist_site(user_id));

CREATE POLICY "Published website cv entries are public"
  ON public.cv_entries FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = cv_entries.profile_id
      AND public.has_published_artist_site(p.user_id)
  ));