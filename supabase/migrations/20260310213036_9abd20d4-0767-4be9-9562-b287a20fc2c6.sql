-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('artist', 'collector', 'registrar');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  id_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Artworks table
CREATE TABLE public.artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  medium TEXT,
  year INTEGER,
  dimensions TEXT,
  description TEXT,
  image_url TEXT,
  provenance TEXT,
  exhibition_history TEXT,
  catalogue_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view own artworks" ON public.artworks FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert artworks" ON public.artworks FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own artworks" ON public.artworks FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own artworks" ON public.artworks FOR DELETE USING (auth.uid() = owner_id);

-- Registrar access
CREATE TABLE public.registrar_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  registrar_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, registrar_id)
);
ALTER TABLE public.registrar_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage registrar access" ON public.registrar_access FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Registrars can view their access" ON public.registrar_access FOR SELECT USING (auth.uid() = registrar_id);

-- Registrar policies on artworks
CREATE POLICY "Registrars can view granted artworks" ON public.artworks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.registrar_access WHERE registrar_id = auth.uid() AND owner_id = artworks.owner_id));
CREATE POLICY "Registrars can insert for granted owners" ON public.artworks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.registrar_access WHERE registrar_id = auth.uid() AND owner_id = artworks.owner_id));
CREATE POLICY "Registrars can update for granted owners" ON public.artworks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.registrar_access WHERE registrar_id = auth.uid() AND owner_id = artworks.owner_id));

-- Timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_artworks_updated_at BEFORE UPDATE ON public.artworks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'artist'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();