UPDATE public.gallery_outreach
SET invited_artists = trim(both E'\n' from regexp_replace(invited_artists, E'(^|\n)Richard Serra[^\n]*', '', 'g')),
    updated_at = now()
WHERE id = '3cd7b6e3-acc1-48ed-bf29-a4b4587d5ffe';