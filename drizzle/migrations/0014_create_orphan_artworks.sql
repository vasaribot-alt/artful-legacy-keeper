CREATE TABLE public.orphan_artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_name text NOT NULL,
  artist_name_normalized text GENERATED ALWAYS AS (lower(trim(artist_name))) STORED,
  title text,
  year text,
  medium text,
  support text,
  dimensions text,
  edition_info text,
  image_url text,
  source_institution text,
  source_reference text,
  notes text,
  status text NOT NULL DEFAULT 'unclaimed',
  claimed_by uuid,
  claimed_at timestamptz,
  claimed_artwork_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.orphan_artworks IS 'Bulk holding area for works reported by institutions/galleries before the artist joins. Works leave this table only when the artist claims them.';
COMMENT ON COLUMN public.orphan_artworks.status IS 'unclaimed | presented | claimed | declined';

CREATE INDEX orphan_artworks_artist_name_idx ON public.orphan_artworks (artist_name_normalized);
CREATE INDEX orphan_artworks_status_idx ON public.orphan_artworks (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orphan_artworks TO authenticated;
GRANT ALL ON public.orphan_artworks TO service_role;

ALTER TABLE public.orphan_artworks ENABLE ROW LEVEL SECURITY;

-- Foundation admins and registrars manage the bulk DB
CREATE POLICY "Admins manage orphan artworks"
ON public.orphan_artworks
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'foundation'))
WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Registrars manage orphan artworks"
ON public.orphan_artworks
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'registrar'))
WITH CHECK (public.has_role(auth.uid(), 'registrar'));

-- Artists can see unclaimed/presented works matching their own name (for claiming)
CREATE POLICY "Artists view works matching their name"
ON public.orphan_artworks
FOR SELECT
TO authenticated
USING (
  status IN ('unclaimed', 'presented')
  AND artist_name_normalized = lower(trim(
    (SELECT full_name FROM public.profiles WHERE user_id = auth.uid())
  ))
);

-- Artists can claim (update status) works matching their own name
CREATE POLICY "Artists claim works matching their name"
ON public.orphan_artworks
FOR UPDATE
TO authenticated
USING (
  status IN ('unclaimed', 'presented')
  AND artist_name_normalized = lower(trim(
    (SELECT full_name FROM public.profiles WHERE user_id = auth.uid())
  ))
)
WITH CHECK (
  claimed_by = auth.uid()
  AND status IN ('claimed', 'declined')
);

CREATE TRIGGER orphan_artworks_updated_at
BEFORE UPDATE ON public.orphan_artworks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();