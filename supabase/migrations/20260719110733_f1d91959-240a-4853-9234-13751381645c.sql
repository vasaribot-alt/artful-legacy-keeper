
CREATE TABLE public.collector_facilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collector_facilities TO authenticated;
GRANT ALL ON public.collector_facilities TO service_role;

ALTER TABLE public.collector_facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own facilities" ON public.collector_facilities
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_collector_facilities_updated_at
  BEFORE UPDATE ON public.collector_facilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_collector_facilities_owner ON public.collector_facilities(owner_id);
