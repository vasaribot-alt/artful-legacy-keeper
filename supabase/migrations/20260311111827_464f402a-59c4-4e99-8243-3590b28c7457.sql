
-- Portfolios table
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  share_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(share_token)
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own portfolios" ON public.portfolios
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert own portfolios" ON public.portfolios
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own portfolios" ON public.portfolios
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete own portfolios" ON public.portfolios
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Public access via share token (for anonymous viewers)
CREATE POLICY "Anyone can view shared portfolios" ON public.portfolios
  FOR SELECT TO anon USING (true);

-- Portfolio artworks junction table
CREATE TABLE public.portfolio_artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, artwork_id)
);

ALTER TABLE public.portfolio_artworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own portfolio artworks" ON public.portfolio_artworks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = portfolio_artworks.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Owners can insert portfolio artworks" ON public.portfolio_artworks
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = portfolio_artworks.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Owners can delete portfolio artworks" ON public.portfolio_artworks
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = portfolio_artworks.portfolio_id AND portfolios.user_id = auth.uid()));

-- Anon access for shared viewing
CREATE POLICY "Anyone can view shared portfolio artworks" ON public.portfolio_artworks
  FOR SELECT TO anon USING (true);

-- Allow anon to read artworks linked in portfolios
CREATE POLICY "Anon can view artworks in shared portfolios" ON public.artworks
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.portfolio_artworks WHERE portfolio_artworks.artwork_id = artworks.id));

-- Allow anon to view artwork images for shared portfolios
CREATE POLICY "Anon can view images in shared portfolios" ON public.artwork_images
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.portfolio_artworks
    WHERE portfolio_artworks.artwork_id = artwork_images.artwork_id
  ));
