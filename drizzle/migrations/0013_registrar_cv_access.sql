-- Allow registrars with granted access to delete CV entries (the editor rewrites entries on save)
CREATE POLICY "Registrars can delete granted cv entries"
ON public.cv_entries FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cv_entries.profile_id AND public.has_registrar_access(auth.uid(), p.user_id)));

-- CV entry images for granted clients
CREATE POLICY "Registrars can view granted cv entry images"
ON public.cv_entry_images FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cv_entries e JOIN public.profiles p ON p.id = e.profile_id WHERE e.id = cv_entry_images.cv_entry_id AND public.has_registrar_access(auth.uid(), p.user_id)));

CREATE POLICY "Registrars can insert granted cv entry images"
ON public.cv_entry_images FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.cv_entries e JOIN public.profiles p ON p.id = e.profile_id WHERE e.id = cv_entry_images.cv_entry_id AND public.has_registrar_access(auth.uid(), p.user_id)));

CREATE POLICY "Registrars can delete granted cv entry images"
ON public.cv_entry_images FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.cv_entries e JOIN public.profiles p ON p.id = e.profile_id WHERE e.id = cv_entry_images.cv_entry_id AND public.has_registrar_access(auth.uid(), p.user_id)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_entry_images TO authenticated;