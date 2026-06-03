DELETE FROM public.artwork_images WHERE artwork_id IN (SELECT id FROM public.artworks WHERE owner_id='1dee59ce-9dea-426a-b5e9-085e3bfc6a17' AND role_context='artist');
DELETE FROM public.artwork_documents WHERE artwork_id IN (SELECT id FROM public.artworks WHERE owner_id='1dee59ce-9dea-426a-b5e9-085e3bfc6a17' AND role_context='artist');
DELETE FROM public.artworks WHERE owner_id='1dee59ce-9dea-426a-b5e9-085e3bfc6a17' AND role_context='artist';
DELETE FROM public.user_roles WHERE user_id='1dee59ce-9dea-426a-b5e9-085e3bfc6a17' AND role='artist';