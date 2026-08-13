UPDATE public.outreach_email_templates
SET body = 'Dear {{contact_person}},

Writing to you in your capacity as {{recipient_capacity}}, I want to introduce the Global Artist Registry Foundation (GARF). We are a Dutch non-profit foundation dedicated to building a permanent, minimum 100-year archival registry to preserve artist legacies. GARF is non-commercial, independent, and museum-grade, providing a neutral archival layer for artists'' careers.

For galleries such as yours, GARF offers a complementary resource that strengthens the long-term integrity of the artists'' work you represent. By securely housing comprehensive archival documentation, GARF enhances provenance records, supports future catalogue raisonné development, and ensures the sustained legacy of artists. This initiative does not replace your existing inventory tools but rather complements and augments them with a permanent, secure, and artist-owned archival solution.

We understand the importance of safeguarding artist histories, and we are reaching out to invite your gallery to become a Supporting Gallery of GARF. We value the significant role you play in shaping artistic legacies.

What we are asking — and what we are not asking:

We ask that you share the artwork documentation you hold for the artists listed below so that each artist can create their own database and archive with GARF. With the help of our automatic upload, the artist will get their own GARF archive of their works safely stored for at least 100 years. GARF is free for all ID-verified artists.

To make the handover simple, GARF accepts Excel or CSV files. A ready-made gallery handover template is available in the artist''s GARF account, and the artist can share it with you. We can also parse standard exports from common gallery systems.

Below a short list noting some points to avoid misreading:

• Your records stay exactly where they are. Your database, your inventory system and your files remain untouched and fully under your control. We are not proposing to take over any function the gallery performs.
• We ask only for a copy — a supplementary archival copy of the documentation relating to the artist''s work — to be placed in the artist''s own GARF archive.
• Ownership does not move. The documentation and information in a GARF archive is owned by the artist, not by GARF and not by us. GARF provides the archive; the artist owns the content and can export or download it at any time.
• GARF is not a marketplace, a dealer, an agent or a sales platform. It takes no commission and does not broker works. It is an archive.

GARF has chosen 100 artists in three categories: Internationally Established, Mid-Career, and Emerging & Global Voices. In each category, we have selected artists from all continents. Your gallery represents the artists below. Please share the following personal access codes with each artist, as these codes provide free lifetime registration at https://globalartistregistry.org:

{{invited_artists}}

We would appreciate the opportunity for a brief introductory call or a written reply to discuss this partnership further and explore how GARF can support the long-term archiving needs of your artists.

With kind regards,',
    subject = 'Partnership Opportunity: Archiving Artist Legacies',
    updated_at = now()
WHERE id = '346db8a8-760a-4e96-9eb0-5c5b42bc0077';