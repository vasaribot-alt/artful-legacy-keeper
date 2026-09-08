# Registrar Application — Professional Fields from Practising Registrar Feedback

Extend the registrar verification application and profile with the fields a working museum registrar expects: personal details, CV upload, collection-management-systems expertise, and task-based areas of work.

## What already exists (kept as-is)
- Full name comes from the account profile
- Credentials, experience summary, years of experience, specializations, languages, geographic coverage, professional statement, references, ARCS membership

## New fields (added to both `registrar_applications` and `registrar_profiles`)

| Field | Type | Notes |
|---|---|---|
| `nationality` | text | Personal information |
| `education` | text | Degree / field |
| `cv_file_path` | text | Uploaded CV (PDF) in private storage, visible to applicant and Foundation reviewer only |
| `cms_experience` | jsonb | List of `{ system, level }` — e.g. TMS, MuseumPlus, Adlib, EMu, PastPerfect, CollectiveAccess; level: basic / proficient / expert |
| `work_areas` | text[] | Checkboxes: Cataloguing of objects, Insurance of exhibitions, Photographing and documenting objects, Preparation and follow-up of loan agreements, Provenance research |

## Database migration
1. `ALTER TABLE` both tables with the five new columns
2. Update the approval trigger `sync_registrar_profile_on_approval()` to copy the new fields into `registrar_profiles`
3. Private storage bucket `registrar-cvs` with RLS: owner can upload/read own CV; Foundation role can read all (for review)
4. Extend `get_verified_registrars()` to also return `work_areas` and `cms_experience` systems (useful directory signals; CV stays private)

## UI changes

### `/registrar/apply` (application form)
- New "Personal information" section: nationality, education (degree/field), CV upload (PDF, drag or browse)
- New "Technical expertise" section: add/remove rows of CMS system + expertise level
- New "Areas of work" section: the five checkboxes from her list (as toggle chips, same style as specializations)
- All fields prefilled when resubmitting

### `/foundation/registrars` (Foundation review)
- Review panel shows nationality, education, CMS expertise list, work-area tags, and a link to open the CV

### `/registrars` (public directory)
- Registrar cards optionally show work areas as small tags (no CV, no nationality — those stay private)

## Notes
- CV is stored in a private bucket; only the registrar and Foundation reviewers can open it (signed URL)
- No changes to the artist/collector contact flow
- Monochrome minimalist styling preserved
