CREATE TABLE public.series_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.series_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own series" ON public.series_groups
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own series" ON public.series_groups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own series" ON public.series_groups
  FOR DELETE TO authenticated USING (auth.uid() = user_id);