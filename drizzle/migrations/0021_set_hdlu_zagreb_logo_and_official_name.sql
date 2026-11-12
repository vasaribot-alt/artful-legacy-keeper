update public.partner_organisations
set logo_url = '/__l5e/assets-v1/f14f3b9b-df1e-41c5-b84f-4b8d679ff290/hdlu-zagreb-logo.jpg',
    intro_text = 'HDLU Zagreb (Croatian Association of Fine Artists Zagreb) invites its members and fellow artists in Croatia to create a free, artist-controlled archive of their work with the Global Artist Registry Foundation. Preserve your documentation, choose what to publish, and name who should take responsibility for your archive in the future.',
    updated_at = now()
where slug = 'hdlu-zagreb';