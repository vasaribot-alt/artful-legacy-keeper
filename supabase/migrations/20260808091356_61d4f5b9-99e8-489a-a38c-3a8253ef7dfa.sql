GRANT SELECT ON public.invite_codes TO authenticated;
CREATE POLICY "Foundation can view invite codes"
ON public.invite_codes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'foundation'::public.app_role));
CREATE POLICY "Inviters can view their own invite codes"
ON public.invite_codes FOR SELECT TO authenticated
USING (created_by = auth.uid());