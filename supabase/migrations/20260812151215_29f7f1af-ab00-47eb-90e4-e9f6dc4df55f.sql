GRANT SELECT ON public.email_send_log TO authenticated;
CREATE POLICY "Foundation admins can read send log"
ON public.email_send_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'foundation'));