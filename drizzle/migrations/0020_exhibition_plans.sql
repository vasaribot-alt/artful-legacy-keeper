CREATE TABLE public.exhibition_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibition_id uuid NOT NULL UNIQUE REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exhibition_plans TO authenticated;
GRANT ALL ON public.exhibition_plans TO service_role;
ALTER TABLE public.exhibition_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and registrars manage exhibition plans" ON public.exhibition_plans
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exhibitions e WHERE e.id = exhibition_id AND e.user_id = owner_id)
    AND (auth.uid() = owner_id OR public.has_registrar_access(auth.uid(), owner_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.exhibitions e WHERE e.id = exhibition_id AND e.user_id = owner_id)
    AND (auth.uid() = owner_id OR public.has_registrar_access(auth.uid(), owner_id))
  );
CREATE TRIGGER exhibition_plans_updated_at BEFORE UPDATE ON public.exhibition_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();