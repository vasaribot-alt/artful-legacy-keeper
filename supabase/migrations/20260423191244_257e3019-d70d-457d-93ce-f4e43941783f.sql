-- Backfill: artworks added by a registrar on behalf of a client were saved with role_context='registrar',
-- which hid them from the client's own dashboard (filters by role_context='artist' or 'collector').
-- Reassign them to the client's primary role.
UPDATE public.artworks a
SET role_context = CASE
  WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = a.owner_id AND ur.role = 'artist') THEN 'artist'
  WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = a.owner_id AND ur.role = 'collector') THEN 'collector'
  ELSE 'artist'
END
WHERE a.role_context = 'registrar'
  AND a.created_by IS DISTINCT FROM a.owner_id;