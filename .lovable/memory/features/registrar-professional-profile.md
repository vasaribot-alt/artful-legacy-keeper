---
name: Registrar Professional Profile Fields
description: Nationality, education, CV upload, CMS expertise and areas of work on registrar application and profile
type: feature
---

Fields added to `registrar_applications` and `registrar_profiles` based on feedback from a practising Norwegian museum registrar (art historian, ex-major museums and large private collections):

- `nationality` (text)
- `education` (text, degree/field)
- `cv_file_path` (text) — PDF in the private `registrar-cvs` bucket, path `{user_id}/cv-{ts}.pdf`. Readable only by the owner and the `foundation` role, via signed URL (300s).
- `cms_experience` (jsonb) — array of `{ system, level }`; levels Basic / Proficient / Expert. Suggestion list includes TMS, MuseumPlus, Adlib/Axiell, EMu, PastPerfect, CollectiveAccess, Primus, Artlogic, FileMaker.
- `work_areas` (text[]) — fixed checkbox list: Cataloguing of objects, Insurance of exhibitions, Photographing and documenting objects, Preparation and follow-up of loan agreements, Provenance research.

`sync_registrar_profile_on_approval()` copies all of these into `registrar_profiles` on approval.

`get_verified_registrars()` returns `education`, `work_areas` and a derived `cms_systems` text[] (distinct system names). CV and nationality stay private and are never exposed publicly.

Surfaces: `/registrar/apply` (form sections Personal information, Technical expertise, Areas of work), `/foundation/registrars` (review panel plus Open CV button), `/registrars` (work-area tags, systems line, both searchable), and `RegistrarCredentialsSummary`.
