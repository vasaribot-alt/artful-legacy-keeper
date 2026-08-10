INSERT INTO public.outreach_email_templates (name, category, subject, body)
SELECT 'Registrar associations — Alliance invitation', 'registrars',
'Invitation: GARF Global Alliance — a permanent archival registry for artist and collection records',
'Dear colleagues,

I am writing on behalf of the Global Artist Registry Foundation (GARF), a Dutch non-profit foundation (stichting) building a permanent, non-commercial archival registry designed to preserve artist and collection records for at least one hundred years.

We are inviting national and international registrar associations to join the GARF Global Alliance, alongside artists, galleries, museums, universities, foundations and corporate collections. Registrars sit at the centre of the documentation practice we are trying to protect, and your members'' standards should shape how a long-term registry works.

What GARF offers your members today:
- Structured artwork records with provenance, exhibition and catalogue histories, condition notes and installation views.
- Location and movement tracking, including facility-level detail, plus insurance-grade valuation exports.
- Verified artist identity and a public registry of vetted registrars that artists and collectors can approach for documentation support.
- Independence: GARF is a foundation, not a dealer, auction house or software vendor. Records are archival, not commercial listings.

As a first step we would welcome a short introductory call, or simply a written reply telling us how your association prefers to engage. We are also happy to present GARF to your members at a meeting or webinar.

With kind regards,'
WHERE NOT EXISTS (
  SELECT 1 FROM public.outreach_email_templates WHERE category = 'registrars'
);