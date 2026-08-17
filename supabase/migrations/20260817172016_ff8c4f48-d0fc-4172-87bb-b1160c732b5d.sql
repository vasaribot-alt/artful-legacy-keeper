UPDATE public.gallery_outreach
SET email_body = regexp_replace(email_body, E'(^|\n)[^\n]*Richard Serra[^\n]*', '', 'g'),
    updated_at = now()
WHERE id = '3cd7b6e3-acc1-48ed-bf29-a4b4587d5ffe';