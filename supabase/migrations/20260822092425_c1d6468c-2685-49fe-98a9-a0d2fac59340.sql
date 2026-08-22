CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  email TEXT NOT NULL CHECK (char_length(trim(email)) BETWEEN 3 AND 255),
  organisation TEXT CHECK (organisation IS NULL OR char_length(organisation) <= 200),
  role TEXT CHECK (role IS NULL OR char_length(role) <= 80),
  subject TEXT CHECK (subject IS NULL OR char_length(subject) <= 200),
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 4000),
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.contact_messages TO anon;
GRANT INSERT ON public.contact_messages TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can send a contact message"
ON public.contact_messages FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Foundation can read contact messages"
ON public.contact_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE POLICY "Foundation can update contact messages"
ON public.contact_messages FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'foundation'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'foundation'::public.app_role));

CREATE POLICY "Foundation can delete contact messages"
ON public.contact_messages FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'foundation'::public.app_role));