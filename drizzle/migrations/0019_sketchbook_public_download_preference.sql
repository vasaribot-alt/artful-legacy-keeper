ALTER TABLE public.sketchbooks ADD COLUMN allow_public_download boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.guard_sketchbook_publication() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.is_public IS DISTINCT FROM (CASE WHEN TG_OP = 'INSERT' THEN false ELSE OLD.is_public END)
      OR NEW.allow_public_download IS DISTINCT FROM (CASE WHEN TG_OP = 'INSERT' THEN false ELSE OLD.allow_public_download END))
     AND (auth.uid() IS DISTINCT FROM NEW.owner_id OR NOT public.has_role(auth.uid(), 'artist'::public.app_role)) THEN
    RAISE EXCEPTION 'Only the artist may change sketchbook visibility or public downloads';
  END IF;
  RETURN NEW;
END $$;
COMMENT ON COLUMN public.sketchbooks.allow_public_download IS 'Artist opt-in to the public PDF download button; false by default. Public reading does not prevent screenshots or copying.';