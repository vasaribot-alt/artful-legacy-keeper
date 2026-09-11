CREATE OR REPLACE FUNCTION public.get_user_storage_usage(_user_id uuid)
 RETURNS TABLE(source text, bytes bigint, file_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    auth.uid() = _user_id
    OR public.has_registrar_access(auth.uid(), _user_id)
    OR auth.role() = 'service_role'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 'artwork-image'::text AS source,
         COALESCE(SUM(COALESCE(ai.original_size, ai.file_size, 0)), 0)::bigint AS bytes,
         COUNT(*)::bigint AS file_count
  FROM artwork_images ai
  JOIN artworks a ON a.id = ai.artwork_id
  WHERE a.owner_id = _user_id
  UNION ALL
  SELECT 'artwork-document',
         COALESCE(SUM(ad.file_size), 0)::bigint,
         COUNT(*)::bigint
  FROM artwork_documents ad
  JOIN artworks a ON a.id = ad.artwork_id
  WHERE a.owner_id = _user_id
  UNION ALL
  SELECT 'exhibition-image',
         COALESCE(SUM(COALESCE(ei.original_size, ei.file_size, 0)), 0)::bigint,
         COUNT(*)::bigint
  FROM exhibition_images ei
  JOIN exhibitions e ON e.id = ei.exhibition_id
  WHERE e.user_id = _user_id
  UNION ALL
  SELECT 'exhibition-document',
         COALESCE(SUM(ed.file_size), 0)::bigint,
         COUNT(*)::bigint
  FROM exhibition_documents ed
  JOIN exhibitions e ON e.id = ed.exhibition_id
  WHERE e.user_id = _user_id
  UNION ALL
  SELECT 'catalogue-cover',
         COALESCE(SUM(c.cover_file_size), 0)::bigint,
         COUNT(*) FILTER (WHERE c.cover_image_path IS NOT NULL)::bigint
  FROM catalogues c
  WHERE c.user_id = _user_id
  UNION ALL
  SELECT 'cv-image',
         COALESCE(SUM(COALESCE(cei.original_size, cei.file_size, 0)), 0)::bigint,
         COUNT(*)::bigint
  FROM cv_entry_images cei
  JOIN cv_entries ce ON ce.id = cei.cv_entry_id
  JOIN profiles p ON p.id = ce.profile_id
  WHERE p.user_id = _user_id
  UNION ALL
  SELECT 'correspondence-original',
         COALESCE(SUM(ci.file_size), 0)::bigint,
         COUNT(*)::bigint
  FROM correspondence_imports ci
  WHERE ci.owner_id = _user_id
  UNION ALL
  SELECT 'correspondence-attachment',
         COALESCE(SUM(ca.file_size), 0)::bigint,
         COUNT(*)::bigint
  FROM correspondence_attachments ca
  WHERE ca.owner_id = _user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_storage_status(_user_id uuid)
 RETURNS TABLE(tier_slug text, tier_name text, quota_bytes bigint, used_bytes bigint, file_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    auth.uid() = _user_id
    OR public.has_registrar_access(auth.uid(), _user_id)
    OR auth.role() = 'service_role'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH tier AS (
    SELECT st.slug, st.name, st.quota_bytes
    FROM public.user_storage_tiers ust
    JOIN public.storage_tiers st ON st.id = ust.tier_id
    WHERE ust.user_id = _user_id
    UNION ALL
    SELECT st.slug, st.name, st.quota_bytes
    FROM public.storage_tiers st
    WHERE st.slug = 'free'
      AND NOT EXISTS (SELECT 1 FROM public.user_storage_tiers WHERE user_id = _user_id)
    LIMIT 1
  ),
  usage AS (
    SELECT COALESCE(SUM(u.bytes),0)::bigint AS used_bytes,
           COALESCE(SUM(u.file_count),0)::bigint AS file_count
    FROM public.get_user_storage_usage(_user_id) u
  )
  SELECT t.slug, t.name, t.quota_bytes, us.used_bytes, us.file_count
  FROM tier t, usage us;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_user_storage_usage(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_storage_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_storage_usage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_storage_status(uuid) TO authenticated, service_role;