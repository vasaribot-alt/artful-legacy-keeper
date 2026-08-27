-- 1. Allow users to add the new roles themselves
DROP POLICY IF EXISTS "Users can insert own non-privileged roles" ON public.user_roles;
CREATE POLICY "Users can insert own non-privileged roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('artist'::app_role, 'collector'::app_role, 'registrar'::app_role, 'gallery'::app_role, 'institution'::app_role)
  );

-- 2. Gallery accounts
CREATE TABLE public.gallery_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  website TEXT,
  vat_number TEXT,
  business_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_accounts TO authenticated;
GRANT ALL ON public.gallery_accounts TO service_role;
ALTER TABLE public.gallery_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gallery owners can manage their gallery" ON public.gallery_accounts
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Foundation can view all galleries" ON public.gallery_accounts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

-- 3. Gallery artist representations
CREATE TABLE public.gallery_artist_representations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID REFERENCES public.gallery_accounts(id) ON DELETE CASCADE NOT NULL,
  artist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'ended')),
  notes TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gallery_id, artist_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_artist_representations TO authenticated;
GRANT ALL ON public.gallery_artist_representations TO service_role;
ALTER TABLE public.gallery_artist_representations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gallery owners can manage their representations" ON public.gallery_artist_representations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gallery_accounts ga WHERE ga.id = gallery_id AND ga.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gallery_accounts ga WHERE ga.id = gallery_id AND ga.owner_id = auth.uid()));
CREATE POLICY "Artists can view and respond to their own representation requests" ON public.gallery_artist_representations
  FOR ALL TO authenticated
  USING (auth.uid() = artist_id)
  WITH CHECK (auth.uid() = artist_id AND status IN ('approved', 'declined', 'ended'));
CREATE POLICY "Foundation can view all representations" ON public.gallery_artist_representations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

-- 4. Gallery inventory overlay
CREATE TABLE public.gallery_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID REFERENCES public.gallery_accounts(id) ON DELETE CASCADE NOT NULL,
  artwork_id UUID REFERENCES public.artworks(id) ON DELETE CASCADE NOT NULL,
  consignment_status TEXT NOT NULL DEFAULT 'with_artist' CHECK (consignment_status IN ('with_gallery', 'with_artist', 'on_loan', 'sold', 'returned')),
  acquisition_cost NUMERIC,
  retail_price NUMERIC,
  sale_price NUMERIC,
  commission_split TEXT,
  gallery_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gallery_id, artwork_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_inventory TO authenticated;
GRANT ALL ON public.gallery_inventory TO service_role;
ALTER TABLE public.gallery_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gallery owners can manage their inventory" ON public.gallery_inventory
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gallery_accounts ga WHERE ga.id = gallery_id AND ga.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gallery_accounts ga WHERE ga.id = gallery_id AND ga.owner_id = auth.uid()));
CREATE POLICY "Artists can view inventory rows for their own artworks" ON public.gallery_inventory
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.artworks a WHERE a.id = artwork_id AND a.owner_id = auth.uid()));
CREATE POLICY "Foundation can view all inventory" ON public.gallery_inventory
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'foundation'));

-- 5. Timestamps triggers for new tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gallery_accounts_updated_at BEFORE UPDATE ON public.gallery_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gallery_artist_representations_updated_at BEFORE UPDATE ON public.gallery_artist_representations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gallery_inventory_updated_at BEFORE UPDATE ON public.gallery_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Add organizer_type to exhibitions for gallery/institution exhibition projects
ALTER TABLE public.exhibitions ADD COLUMN IF NOT EXISTS organizer_type TEXT NOT NULL DEFAULT 'artist' CHECK (organizer_type IN ('artist', 'gallery', 'institution'));

-- 7. Helper: gallery workspace donation unlock
CREATE OR REPLACE FUNCTION public.has_gallery_workspace_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.donations
    WHERE user_id = _user_id
      AND status = 'completed'
      AND kind IN ('one_off', 'monthly', 'annual')
    UNION ALL
    SELECT 1 FROM public.donation_subscriptions
    WHERE user_id = _user_id
      AND kind IN ('monthly', 'annual', 'collector_access')
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;
REVOKE ALL ON FUNCTION public.has_gallery_workspace_access(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_gallery_workspace_access(UUID) TO authenticated;
