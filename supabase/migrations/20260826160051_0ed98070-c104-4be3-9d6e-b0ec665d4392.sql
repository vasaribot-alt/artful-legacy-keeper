CREATE TABLE public.research_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  created_by uuid NOT NULL,
  artist_name text,
  seed_urls text[] NOT NULL DEFAULT '{}',
  hints text,
  status text NOT NULL DEFAULT 'running',
  error text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE public.research_findings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.research_runs(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  kind text NOT NULL,
  field text,
  label text NOT NULL,
  value text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url text,
  confidence text,
  status text NOT NULL DEFAULT 'new',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_research_findings_run ON public.research_findings(run_id);
CREATE INDEX idx_research_findings_owner ON public.research_findings(owner_id, status);
CREATE INDEX idx_research_runs_owner ON public.research_runs(owner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_runs TO authenticated;
GRANT ALL ON public.research_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_findings TO authenticated;
GRANT ALL ON public.research_findings TO service_role;

ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their research runs" ON public.research_runs
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND created_by = auth.uid());

CREATE POLICY "Registrars view client research runs" ON public.research_runs
  FOR SELECT TO authenticated
  USING (public.has_registrar_access(auth.uid(), owner_id));

CREATE POLICY "Registrars create client research runs" ON public.research_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_registrar_access(auth.uid(), owner_id) AND created_by = auth.uid());

CREATE POLICY "Registrars update client research runs" ON public.research_runs
  FOR UPDATE TO authenticated
  USING (public.has_registrar_access(auth.uid(), owner_id))
  WITH CHECK (public.has_registrar_access(auth.uid(), owner_id));

CREATE POLICY "Owners manage their research findings" ON public.research_findings
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Registrars view client research findings" ON public.research_findings
  FOR SELECT TO authenticated
  USING (public.has_registrar_access(auth.uid(), owner_id));

CREATE POLICY "Registrars update client research findings" ON public.research_findings
  FOR UPDATE TO authenticated
  USING (public.has_registrar_access(auth.uid(), owner_id))
  WITH CHECK (public.has_registrar_access(auth.uid(), owner_id));