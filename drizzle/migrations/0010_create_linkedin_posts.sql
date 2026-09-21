CREATE TABLE public.linkedin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  link_url text,
  post_urn text,
  published_at timestamptz,
  last_error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_posts TO authenticated;
GRANT ALL ON public.linkedin_posts TO service_role;

ALTER TABLE public.linkedin_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foundation can read linkedin posts"
ON public.linkedin_posts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can insert linkedin posts"
ON public.linkedin_posts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can update linkedin posts"
ON public.linkedin_posts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'foundation'));

CREATE POLICY "Foundation can delete linkedin posts"
ON public.linkedin_posts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'foundation'));