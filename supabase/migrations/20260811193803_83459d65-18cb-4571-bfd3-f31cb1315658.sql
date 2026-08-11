UPDATE outreach_email_templates
SET
  subject = 'Invitation: GARF Global Alliance — a permanent archival registry for artist and collection records',
  body = 'Dear colleagues,

I am writing on behalf of the Global Artist Registry Foundation (GARF), a Dutch non-profit foundation (stichting) established to address a problem that, as registrars, you know intimately: the fragility of the documentation that surrounds a work of art.

Every year, artist records, provenance notes, exhibition histories, and condition reports are lost — to hard-drive failures, gallery closures, studio moves, software deprecations, and the simple passage of time. A work may survive for centuries; its documentation rarely survives a single generation. GARF was founded to change that by building a permanent, non-commercial archival registry designed to preserve artist and collection records for at least one hundred years.

## What GARF is — and is not

GARF is a **foundation**, not a dealer, auction house, or software vendor. There is no commercial layer: no marketplace, no transaction fees, no advertising. The registry exists solely as an independent cultural archive.

Crucially, GARF does **not** take ownership of any information, nor does it compete with the documentation systems that museums, galleries, and registrars already maintain. What we ask for — and what artists themselves control — is a **supplementary copy** of documentation, placed into a long-term archival structure. The original records stay exactly where they are, untouched. The artist retains full ownership of every record in GARF and can download, export, or remove their material at any time.

## Why registrar associations matter

Registrars sit at the centre of the documentation practice we are trying to protect. Your members set the professional standards — for condition reporting, loans, inventory, provenance documentation, and collections care — that any credible long-term registry must be built upon. We are not proposing to replace or duplicate that expertise; we are asking how a permanent archive should align with the standards your association already upholds.

## What GARF offers today

- **Structured artwork records** with provenance, exhibition and catalogue histories, condition notes, and installation views — stored in a consistent, exportable format that institutions can rely on.
- **Location and movement tracking**, including facility-level detail and insurance-grade valuation exports.
- **Verified artist identity** and a **public registry of vetted registrars** that artists and collectors can approach for professional documentation support.
- **Independence and longevity**: redundant archival storage, non-commercial governance, and a preservation horizon of at least one hundred years.

## What we are asking

As a first step, we would welcome a short introductory call — or simply a written reply telling us how your association prefers to engage. We are also happy to present GARF to your members at a meeting or webinar, and to listen to your feedback on how the registry should serve the profession.

There is no obligation, and no cost. We are building something that will outlast all of us, and we believe it should be shaped by the people who understand documentation best.

With kind regards,',
  updated_at = now()
WHERE category = 'registrars' AND name = 'Registrar associations — Alliance invitation';