
CREATE TABLE public.galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  city text,
  established_year integer,
  website text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS but allow public read access (reference data)
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view galleries"
  ON public.galleries
  FOR SELECT
  TO authenticated
  USING (true);

-- Index for search
CREATE INDEX idx_galleries_name ON public.galleries USING gin (to_tsvector('simple', name));
CREATE INDEX idx_galleries_country ON public.galleries (country);
CREATE INDEX idx_galleries_city ON public.galleries (city);
