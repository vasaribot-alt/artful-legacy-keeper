
-- Add enrichment columns to galleries
ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS rank INTEGER,
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT NOT NULL DEFAULT 'not_attempted',
  ADD COLUMN IF NOT EXISTS enrichment_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_notes TEXT;

CREATE INDEX IF NOT EXISTS galleries_rank_idx ON public.galleries(rank) WHERE rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS galleries_enrichment_status_idx ON public.galleries(enrichment_status);

-- Outreach tracker table
CREATE TABLE IF NOT EXISTS public.gallery_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_contacted',
  campaign_tag TEXT,
  first_contacted_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gallery_id, campaign_tag)
);

CREATE INDEX IF NOT EXISTS gallery_outreach_status_idx ON public.gallery_outreach(status);
CREATE INDEX IF NOT EXISTS gallery_outreach_gallery_id_idx ON public.gallery_outreach(gallery_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_outreach TO authenticated;
GRANT ALL ON public.gallery_outreach TO service_role;

ALTER TABLE public.gallery_outreach ENABLE ROW LEVEL SECURITY;

-- Foundation admins only
CREATE POLICY "Foundation admins manage outreach"
ON public.gallery_outreach
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'foundation'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE TRIGGER update_gallery_outreach_updated_at
BEFORE UPDATE ON public.gallery_outreach
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow foundation admins to update galleries table (for enrichment writes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='galleries' AND policyname='Foundation admins update galleries'
  ) THEN
    CREATE POLICY "Foundation admins update galleries"
    ON public.galleries
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'foundation'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'foundation'::public.app_role));
  END IF;
END $$;
