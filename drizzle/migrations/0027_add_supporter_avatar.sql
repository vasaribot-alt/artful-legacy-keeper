ALTER TABLE public.donors ADD COLUMN avatar_url text;

DROP FUNCTION public.get_public_donors();

CREATE OR REPLACE FUNCTION public.get_public_donors()
RETURNS TABLE(id uuid, full_name text, tier donor_tier, message text, descriptor text, avatar_url text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT d.id, d.full_name, d.tier, d.message, d.descriptor, d.avatar_url, d.created_at
  FROM public.donors d WHERE d.is_public = true ORDER BY d.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_donors() TO anon, authenticated;

UPDATE public.donors SET avatar_url = 'https://ofqaxojjqryylcugegke.supabase.co/storage/v1/object/public/profile-photos/55ec132d-f1cb-4c43-9f00-a82b161e5d7d/avatar.jpg' WHERE full_name = 'Alfred Freddy Krupa' AND tier = 'ambassador';
UPDATE public.donors SET avatar_url = 'https://ofqaxojjqryylcugegke.supabase.co/storage/v1/object/public/profile-photos/2940d120-7cb1-4860-932f-d7ca4b8b3355/avatar.jpeg' WHERE full_name = 'Bjarne Våga' AND tier = 'ambassador';
UPDATE public.donors SET avatar_url = 'https://ofqaxojjqryylcugegke.supabase.co/storage/v1/object/public/profile-photos/2ca40668-2ce3-4e6b-a362-70b196297205/avatar.jpeg' WHERE full_name = 'Elin Bergstø' AND tier = 'ambassador';
UPDATE public.donors SET avatar_url = 'https://ofqaxojjqryylcugegke.supabase.co/storage/v1/object/public/profile-photos/9cbde5d9-2437-47a8-a078-8ce56c01c2a9/avatar.jpg' WHERE full_name = 'Georgia Michaelides Saad' AND tier = 'ambassador';
UPDATE public.donors SET avatar_url = 'https://ofqaxojjqryylcugegke.supabase.co/storage/v1/object/public/profile-photos/6a9f504b-02de-49dd-926d-38774ff2fda3/avatar.jpg' WHERE full_name = 'Krešimira Gojanović' AND tier = 'ambassador';