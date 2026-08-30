CREATE TABLE public.tracked_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL,
  label TEXT,
  source_table TEXT,
  source_id UUID,
  recipient_name TEXT,
  recipient_email TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracked_links TO authenticated;
GRANT ALL ON public.tracked_links TO service_role;

ALTER TABLE public.tracked_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foundation can view tracked links"
  ON public.tracked_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can create tracked links"
  ON public.tracked_links FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'foundation') AND created_by = auth.uid());

CREATE POLICY "Foundation can update tracked links"
  ON public.tracked_links FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'))
  WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can delete tracked links"
  ON public.tracked_links FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE TRIGGER update_tracked_links_updated_at
  BEFORE UPDATE ON public.tracked_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tracked_links_source ON public.tracked_links(source_table, source_id);

CREATE TABLE public.tracked_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.tracked_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  country TEXT,
  device TEXT,
  referrer TEXT,
  visitor_hash TEXT
);

GRANT SELECT ON public.tracked_link_clicks TO authenticated;
GRANT ALL ON public.tracked_link_clicks TO service_role;

ALTER TABLE public.tracked_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foundation can view tracked link clicks"
  ON public.tracked_link_clicks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

CREATE INDEX idx_tracked_link_clicks_link ON public.tracked_link_clicks(link_id, clicked_at DESC);

CREATE OR REPLACE FUNCTION public.record_tracked_link_click(
  _code TEXT,
  _country TEXT DEFAULT NULL,
  _device TEXT DEFAULT NULL,
  _referrer TEXT DEFAULT NULL,
  _visitor_hash TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link public.tracked_links;
BEGIN
  SELECT * INTO _link FROM public.tracked_links WHERE code = _code;
  IF _link.id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.tracked_link_clicks (link_id, country, device, referrer, visitor_hash)
  VALUES (_link.id, left(_country, 8), left(_device, 32), left(_referrer, 500), left(_visitor_hash, 64));

  RETURN _link.destination;
END;
$$;

REVOKE ALL ON FUNCTION public.record_tracked_link_click(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_tracked_link_click(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;