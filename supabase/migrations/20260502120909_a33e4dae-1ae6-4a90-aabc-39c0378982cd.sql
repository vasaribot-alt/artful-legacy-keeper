
CREATE TABLE public.artwork_match_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibition_id uuid NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  exhibition_image_id uuid NOT NULL REFERENCES public.exhibition_images(id) ON DELETE CASCADE,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reasoning text,
  crop_x numeric,
  crop_y numeric,
  crop_width numeric,
  crop_height numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ams_exhibition ON public.artwork_match_suggestions(exhibition_id, status);
CREATE INDEX idx_ams_owner ON public.artwork_match_suggestions(owner_id);
CREATE UNIQUE INDEX idx_ams_unique_pending
  ON public.artwork_match_suggestions(exhibition_image_id, artwork_id)
  WHERE status = 'pending';

ALTER TABLE public.artwork_match_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own suggestions"
  ON public.artwork_match_suggestions FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_registrar_access(auth.uid(), owner_id));

CREATE POLICY "Owners update own suggestions"
  ON public.artwork_match_suggestions FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_registrar_access(auth.uid(), owner_id));

CREATE POLICY "Owners delete own suggestions"
  ON public.artwork_match_suggestions FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_registrar_access(auth.uid(), owner_id));
