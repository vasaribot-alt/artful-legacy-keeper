CREATE OR REPLACE FUNCTION public.get_gallery_roster(_gallery_id uuid)
RETURNS TABLE(
  id uuid,
  gallery_id uuid,
  artist_id uuid,
  status text,
  notes text,
  artist_name text,
  artist_email text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.gallery_id, r.artist_id, r.status, r.notes,
         p.full_name, p.email, r.created_at
  FROM public.gallery_artist_representations r
  JOIN public.gallery_accounts g ON g.id = r.gallery_id
  LEFT JOIN public.profiles p ON p.user_id = r.artist_id
  WHERE r.gallery_id = _gallery_id
    AND g.owner_id = auth.uid()
  ORDER BY r.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_gallery_roster(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_gallery_roster(uuid) TO authenticated;