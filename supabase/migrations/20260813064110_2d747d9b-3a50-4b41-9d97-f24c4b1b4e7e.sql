UPDATE public.outreach_email_templates
SET body = REPLACE(
  body,
  'We are asking you to share documentation you already hold on the works of the artists you represent, so that it can be added to each artist''s own archive through our automated upload. We would also be grateful if you encouraged your artists to keep their own records, preferably with GARF.',
  'We ask that you share the documentation you have with all your artists so that each artist can create their own database and archive. We also appreciate it if you encourage your artists to create their own archives and preferably store them at GARF. With the help of our automatic upload, the artist will get their own archive of their works safely stored for at least 100 years.'
)
WHERE id = '812ad237-e4d3-4822-be89-8f6a242a597a';

UPDATE public.outreach_email_templates
SET body = REPLACE(
  body,
  'We are asking you to share documentation on artworks that you have documented for each artist so they can have the documentation added to their list of works using our automated upload. We also would appreciate that you encourage all your artists to keep their own records and preferably store this with GARF.',
  'We ask that you share the documentation you have with all your artists so that each artist can create their own database and archive. We also appreciate it if you encourage your artists to create their own archives and preferably store them at GARF. With the help of our automatic upload, the artist will get their own archive of their works safely stored for at least 100 years.'
)
WHERE id = '346db8a8-760a-4e96-9eb0-5c5b42bc0077';