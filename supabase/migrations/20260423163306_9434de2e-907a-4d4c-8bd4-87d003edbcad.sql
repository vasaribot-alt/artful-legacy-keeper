-- Add verification tracking columns to artworks
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Constrain status values
ALTER TABLE public.artworks
  DROP CONSTRAINT IF EXISTS artworks_verification_status_check;
ALTER TABLE public.artworks
  ADD CONSTRAINT artworks_verification_status_check
  CHECK (verification_status IN ('verified', 'pending', 'unverified'));

-- Backfill: any existing work owned by the artist (created by themselves) → verified
UPDATE public.artworks
SET verification_status = 'verified',
    verified_at = COALESCE(verified_at, updated_at),
    verified_by = COALESCE(verified_by, owner_id),
    created_by = COALESCE(created_by, owner_id)
WHERE verification_status = 'pending';

-- Trigger function: auto-tag created_by + verification on INSERT
CREATE OR REPLACE FUNCTION public.set_artwork_verification_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Record who created the row
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  -- If the creator is the owner (artist adding their own work) → auto-verify
  IF NEW.created_by = NEW.owner_id THEN
    NEW.verification_status := 'verified';
    NEW.verified_at := now();
    NEW.verified_by := NEW.owner_id;
  ELSE
    -- Registrar or someone else created it → pending artist review
    NEW.verification_status := 'pending';
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_artwork_verification_on_insert ON public.artworks;
CREATE TRIGGER trg_set_artwork_verification_on_insert
BEFORE INSERT ON public.artworks
FOR EACH ROW
EXECUTE FUNCTION public.set_artwork_verification_on_insert();

-- Trigger function: revert verification when a non-owner edits core fields
CREATE OR REPLACE FUNCTION public.revert_artwork_verification_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  editor uuid := auth.uid();
  core_changed boolean := false;
BEGIN
  -- If the artist (owner) is the one editing, do nothing — they implicitly approve
  IF editor IS NULL OR editor = NEW.owner_id THEN
    RETURN NEW;
  END IF;

  -- Detect changes to core archival fields
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.year IS DISTINCT FROM OLD.year
     OR NEW.medium IS DISTINCT FROM OLD.medium
     OR NEW.dimensions IS DISTINCT FROM OLD.dimensions
     OR NEW.height IS DISTINCT FROM OLD.height
     OR NEW.width IS DISTINCT FROM OLD.width
     OR NEW.depth IS DISTINCT FROM OLD.depth
     OR NEW.edition_number IS DISTINCT FROM OLD.edition_number
     OR NEW.edition_count IS DISTINCT FROM OLD.edition_count
     OR NEW.artist_proofs IS DISTINCT FROM OLD.artist_proofs
     OR NEW.signed IS DISTINCT FROM OLD.signed
  THEN
    core_changed := true;
  END IF;

  IF core_changed AND OLD.verification_status = 'verified' THEN
    NEW.verification_status := 'pending';
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revert_artwork_verification_on_update ON public.artworks;
CREATE TRIGGER trg_revert_artwork_verification_on_update
BEFORE UPDATE ON public.artworks
FOR EACH ROW
EXECUTE FUNCTION public.revert_artwork_verification_on_update();

-- Trigger function: revert verification when a non-owner adds/removes images
CREATE OR REPLACE FUNCTION public.revert_artwork_verification_on_image_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  editor uuid := auth.uid();
  art_owner uuid;
  art_id uuid;
BEGIN
  art_id := COALESCE(NEW.artwork_id, OLD.artwork_id);

  SELECT owner_id INTO art_owner FROM public.artworks WHERE id = art_id;

  -- If the artist themselves is editing, leave verification alone
  IF editor IS NULL OR editor = art_owner THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.artworks
  SET verification_status = 'pending',
      verified_at = NULL,
      verified_by = NULL
  WHERE id = art_id
    AND verification_status = 'verified';

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_revert_artwork_verification_on_image_insert ON public.artwork_images;
CREATE TRIGGER trg_revert_artwork_verification_on_image_insert
AFTER INSERT ON public.artwork_images
FOR EACH ROW
EXECUTE FUNCTION public.revert_artwork_verification_on_image_change();

DROP TRIGGER IF EXISTS trg_revert_artwork_verification_on_image_delete ON public.artwork_images;
CREATE TRIGGER trg_revert_artwork_verification_on_image_delete
AFTER DELETE ON public.artwork_images
FOR EACH ROW
EXECUTE FUNCTION public.revert_artwork_verification_on_image_change();

-- Index for fast "pending review" queries
CREATE INDEX IF NOT EXISTS idx_artworks_owner_verification
  ON public.artworks(owner_id, verification_status);