CREATE POLICY "Foundation can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'foundation'::app_role));

CREATE POLICY "Foundation can view all user roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'foundation'::app_role));