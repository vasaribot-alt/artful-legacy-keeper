
-- 1. PRIVILEGE ESCALATION
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
CREATE POLICY "Users can insert own non-privileged roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('artist'::app_role, 'collector'::app_role, 'registrar'::app_role)
  );

-- 2. INVITE CODES
DROP POLICY IF EXISTS "Anyone can validate invite codes" ON public.invite_codes;

CREATE OR REPLACE FUNCTION public.validate_invite_code(_code text)
RETURNS TABLE(id uuid, tier founding_artist_tier, is_valid boolean, already_used boolean, inactive boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    ic.id,
    ic.tier,
    (ic.is_active AND ic.used_by IS NULL) AS is_valid,
    (ic.used_by IS NOT NULL) AS already_used,
    (NOT ic.is_active) AS inactive
  FROM public.invite_codes ic
  WHERE upper(ic.code) = upper(_code)
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.validate_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO anon, authenticated;

-- 3. PORTFOLIOS shared access
DROP POLICY IF EXISTS "Anyone can view shared portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Anyone can view shared portfolio artworks" ON public.portfolio_artworks;
DROP POLICY IF EXISTS "Anon can view artworks in shared portfolios" ON public.artworks;

CREATE OR REPLACE FUNCTION public.get_shared_portfolio(_token text)
RETURNS TABLE(
  portfolio_id uuid,
  portfolio_name text,
  artwork_id uuid,
  title text,
  year integer,
  medium text,
  height numeric,
  width numeric,
  depth numeric,
  display_order integer,
  image_path text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    a.id,
    a.title,
    a.year,
    a.medium,
    a.height,
    a.width,
    a.depth,
    pa.display_order,
    (SELECT ai.storage_path FROM public.artwork_images ai
       WHERE ai.artwork_id = a.id
       ORDER BY ai.display_order
       LIMIT 1) AS image_path
  FROM public.portfolios p
  JOIN public.portfolio_artworks pa ON pa.portfolio_id = p.id
  JOIN public.artworks a ON a.id = pa.artwork_id
  WHERE p.share_token = _token
  ORDER BY pa.display_order;
$$;
REVOKE EXECUTE ON FUNCTION public.get_shared_portfolio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_portfolio(text) TO anon, authenticated;

-- 4-6. Column-level revokes for sensitive columns
REVOKE SELECT (buyer_name, sold_date, price, provenance, artwork_location) ON public.artworks FROM anon;
REVOKE SELECT (buyer_name, sold_date, provenance, artwork_location) ON public.edition_items FROM anon;
REVOKE SELECT (phone, email, studio_address, contacts, phone_prefix, cr_contact_email) ON public.profiles FROM anon;

-- 7. STORAGE: catalogue-covers ownership
DROP POLICY IF EXISTS "Auth users can upload catalogue covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete catalogue covers" ON storage.objects;
CREATE POLICY "Auth users can upload own catalogue covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catalogue-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Auth users can delete own catalogue covers" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'catalogue-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 8. STORAGE: cv-images DELETE ownership (keep public read; bucket is public)
DROP POLICY IF EXISTS "Users can view cv images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own cv images" ON storage.objects;
CREATE POLICY "Public can view cv images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'cv-images');
CREATE POLICY "Users can delete own cv images by folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cv-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 9. STORAGE: exhibition-documents DELETE ownership
DROP POLICY IF EXISTS "Auth users can delete exhibition documents" ON storage.objects;
CREATE POLICY "Auth users can delete own exhibition documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'exhibition-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 10. STORAGE: exhibition-images DELETE ownership
DROP POLICY IF EXISTS "Auth users can delete own exhibition images" ON storage.objects;
CREATE POLICY "Auth users can delete own exhibition images by folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'exhibition-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 11. FUNCTION SEARCH PATH on email queue helpers
CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN PERFORM pgmq.create(dlq_name); EXCEPTION WHEN OTHERS THEN NULL; END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN PERFORM pgmq.delete(source_queue, message_id); EXCEPTION WHEN undefined_table THEN NULL; END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN RETURN FALSE; END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;
