-- Protected works: full image stays in the archive, public sees a small watermarked version only.
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS protected_display boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS protect_new_artworks boolean NOT NULL DEFAULT false;
ALTER TABLE public.artwork_images ADD COLUMN IF NOT EXISTS protected_storage_path text;

-- Apply the artist's default to new artworks
CREATE OR REPLACE FUNCTION public.apply_protection_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.protected_display IS NOT TRUE THEN
    SELECT COALESCE(p.protect_new_artworks, false) INTO NEW.protected_display
    FROM public.profiles p
    WHERE p.user_id = NEW.owner_id;
    NEW.protected_display := COALESCE(NEW.protected_display, false);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_protection_default_trg ON public.artworks;
CREATE TRIGGER apply_protection_default_trg
BEFORE INSERT ON public.artworks
FOR EACH ROW EXECUTE FUNCTION public.apply_protection_default();

-- Public image rows: protected works are no longer readable anonymously; the
-- public reads image paths through get_public_artwork_images instead.
DROP POLICY IF EXISTS "Anyone can view CR-listed artwork images" ON public.artwork_images;
CREATE POLICY "Anyone can view CR-listed artwork images"
ON public.artwork_images FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.artworks a
  JOIN public.profiles p ON p.user_id = a.owner_id
  WHERE a.id = artwork_images.artwork_id
    AND a.verification_status = 'verified'
    AND p.cr_listed = true
    AND a.protected_display = false
));

DROP POLICY IF EXISTS "Anyone can view founding artist artwork images" ON public.artwork_images;
CREATE POLICY "Anyone can view founding artist artwork images"
ON public.artwork_images FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.artworks a
  JOIN public.founding_artists f ON f.user_id = a.owner_id
  WHERE a.id = artwork_images.artwork_id
    AND a.protected_display = false
));

DROP POLICY IF EXISTS "Anyone can view published website artwork images" ON public.artwork_images;
CREATE POLICY "Anyone can view published website artwork images"
ON public.artwork_images FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.artworks a
  WHERE a.id = artwork_images.artwork_id
    AND COALESCE(a.role_context, 'artist') = 'artist'
    AND public.has_published_artist_site(a.owner_id)
    AND a.protected_display = false
));

-- Single place that decides which file the public may see for a work.
CREATE OR REPLACE FUNCTION public.get_public_artwork_images(_artwork_ids uuid[])
RETURNS TABLE(
  id uuid,
  artwork_id uuid,
  display_order integer,
  protected boolean,
  bucket text,
  path text,
  width integer,
  height integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ai.id,
    ai.artwork_id,
    ai.display_order,
    a.protected_display,
    CASE
      WHEN a.protected_display THEN 'artwork-images-protected'
      WHEN ai.web_storage_path IS NOT NULL THEN 'artwork-images-web'
      ELSE 'artwork-images'
    END,
    CASE
      WHEN a.protected_display THEN ai.protected_storage_path
      WHEN ai.web_storage_path IS NOT NULL THEN ai.web_storage_path
      ELSE ai.storage_path
    END,
    ai.width,
    ai.height
  FROM public.artwork_images ai
  JOIN public.artworks a ON a.id = ai.artwork_id
  WHERE ai.artwork_id = ANY(_artwork_ids)
    AND (NOT a.protected_display OR ai.protected_storage_path IS NOT NULL)
  ORDER BY ai.display_order NULLS LAST, ai.created_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_artwork_images(uuid[]) TO anon, authenticated;
