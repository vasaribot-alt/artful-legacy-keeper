DROP POLICY IF EXISTS "Anyone can send a contact message" ON public.contact_messages;
CREATE POLICY "Anyone can send a contact message" ON public.contact_messages
FOR INSERT TO anon, authenticated
WITH CHECK (
  handled = false
  AND length(btrim(name)) BETWEEN 1 AND 200
  AND length(email) BETWEEN 3 AND 320 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(btrim(message)) BETWEEN 1 AND 10000
  AND (organisation IS NULL OR length(organisation) <= 300)
  AND (role IS NULL OR length(role) <= 200)
  AND (subject IS NULL OR length(subject) <= 300)
);