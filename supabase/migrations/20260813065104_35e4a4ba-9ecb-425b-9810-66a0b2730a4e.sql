UPDATE public.outreach_email_templates
SET body = replace(body, 'It is an an archive.', 'It is an archive.'),
    updated_at = now()
WHERE id = '346db8a8-760a-4e96-9eb0-5c5b42bc0077';