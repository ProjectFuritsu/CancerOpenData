# Changelog

What changed in the Cancer Open Data API, newest first.
The API's version is the deployed Git commit: `GET /` returns it in `version`.
Dates are Philippine time (UTC+8). See [MILESTONES.md](MILESTONES.md) for the bigger plan.

## Unreleased

### v2 (in development, not public)
A new data shape, to be served at `/v2/…` next to v1. Not live yet; v1 is unchanged by it.
- Institutions get `branches` (address, map point, hours and contacts per office).
- Lists of `sources`, `cancerTypes`, `lastVerified`, and one fixed list of contact types.
- Benefit `amount` separate from the benefit name; clinic `bookingType` instead of `isWalkIns` and `canDoBoth`; `eligibility` as a list.
- No loan programs. New: PCSO (Medical Assistance Program) and DOH (MAIFIP).
- Feeds: 6 posts from the Philippine Society of Medical Oncology (psmo.ph): NCCN's locally adapted treatment guidelines, PANAG-ISTORYA (Davao City), the National Cancer Alliance, Barangayan in Gingoog City, "Ano ang Sarcoma?" and the 1st National Patient Navigation Conference. Titles, authors and dates as written; short summaries in our own words, with a link to each post.
- Feeds: 7 Davao City cancer news posts (2025–2026) from the City Government of Davao, SunStar Davao, MindaNews and the Daily Tribune: free cervical and breast cancer screening in health centers, breast and cervical cancer deaths, child cancer treatment at SPMC, SPMC's stereotactic radiosurgery, and a Malasakit Center patient story. Same rules.
- Health institutions: "SPMC Cancer Institute" is renamed "Southern Philippines Medical Center", since its cancer clinics are in several departments. It gets its official site as source, its main contacts, and 8 department cancer clinics with schedules (adult oncology and hematology, surgical oncology, gynecologic oncology, trophoblastic clinic, colposcopy and Pap smear, pediatric oncology, breast imaging). New: Davao Doctors Hospital with 6 cancer services (radiation oncology, external beam radiation, brachytherapy, in-patient chemotherapy, radioactive iodine therapy, long-term radiotherapy). Sources: spmc.doh.gov.ph and ddh.com.ph.
- SPMC fees for radiation therapy, the adult cancer unit (room and board, average chemotherapy fees) and breast imaging, as written in SPMC's official Rates and Fees PDF (tables as of August 31, 2022). The PDF is listed in each service's sources.
- PhilHealth Z Benefits is one program (`Z Benefits`) instead of five. Every benefit and amount, every eligibility rule and each cancer's description from v1 is kept, labeled with its cancer (for example "Breast Cancer (cStage 0 to IV): Total package").
- A `null` or empty value means "Not available".
- Served at `/v2/` next to v1: the files at `/v2/<Folder>/<File>.json`, the dataset list at `GET /v2/`, and its own spec at `/v2/openapi.json`. v1 paths don't change.
- The docs page has a version picker (v1 or v2); `/docs/?version=v2` opens v2.

### Repo
- Issue forms: wrong data, new resource, API problem, privacy or removal request. Blank issues are off.
- Deploy emails: after each successful deploy, an email with the new version, the changes and the changed files goes to the people who build on the API (setup in [MAINTAINING.md](MAINTAINING.md#deploy-emails)).

## 2026-11-14 · version `416aad5`

### Data
- Clinics and schedules of 12 specialists (#1–#11, #13) updated from NowServing (read 2026-11-14): new clinics for #2, #3, #11 and #13, more days, and booking types as NowServing shows them. Schedules are now one line per day.

## 2026-11-14 · version `8abad69`

### Data
- 5 more medical specialists (ids 25–29), from the NowServing Davao City oncology listing: Anna Mariel Rivera, Jeannine Anjelica Ledesma-Quijada, Romulo Ong Abrantes, Kristine Kamille Nieto-Lorenzo and Adrian Lorenzo. Sources: their SeriousMD profile pages. No photos (consent needed); clinic contacts not copied (personal mobile numbers).
- Fixed `source` of specialists #6, #10 and #11: each pointed to another doctor's page.

## 2026-11-14 · version `4f92f54`

### Images
- PhilHealth, SPMC Cancer Institute and AMUMA now use images hosted by this API (`/images/…`, WebP) instead of links to other sites. AMUMA has a new image: `amuma.webp` replaces `amuma.jpg`.
- Image standard ([images/README.md](images/README.md)): WebP; doctor photos square up to 800 × 800, other images 16:9 up to 1200 × 675. `npm run validate` warns about images that are not WebP.
- Images for PCSO and DOH are ready for v2.

### Docs
- Added [MILESTONES.md](MILESTONES.md) and this changelog.
- README is now a short quick start. The full API reference moved to [API-GUIDE.md](API-GUIDE.md), and how the API is served and maintained to [MAINTAINING.md](MAINTAINING.md).
- "Not given" is now "Not available" in the docs, the word apps should show for `null` or empty values.
- Scope stated: **Davao City**. Every record has at least one place in Davao City (or an online clinic for Davao City patients); a doctor's other clinics outside the city may also be listed.

## 2026-11-13 · version `8d206e1`

### Added
- 11 medical specialists (ids 14–24) at Davao Doctors Hospital and Brokenshire Medical Center.
- Support group: House of Hope Foundation for Kids with Cancer Inc. (id 2).
- 5 PhilHealth Z Benefits programs: Breast, Acute Lymphocytic / Lymphoblastic Leukemia, Prostate, Cervical and Colorectal Cancer.
- `source` on financial programs: a link to the program's official page (optional).
- SPMC Cancer Institute: 3 real services (Adult Cancer Clinic and Infusion Unit, Radiation Therapy, Cancer Assistance Fund), replacing 3 placeholder services.
- PhilHealth YAKAP: 7 benefits, including screening for breast, liver, colorectal and lung cancer.

### Changed
- **Schema: these fields can now be `null`** (not known yet): program `source`, clinic `isWalkIns` and `canDoBoth`, support group `socmedURL` and `founder`. Apps should show "Not available" for `null`, and check booking with `=== true` / `=== false`.
- PhilHealth YAKAP rewritten from its official page (philhealth.gov.ph/yakap): name, member groups, description, requirement and 5 steps.
- Z Benefits: one requirement ("PhilHealth ID") and one step (go to the hospital's Z Benefits coordinator). Official details stay in each program's `source`.
- Feeds: `content` is now a short summary; the link to the full article stays in `source`.
- AMUMA and House of Hope: `socmedURL` is now the group's official Facebook page.

### Removed
- SPMC Cancer Institute's 3 contacts: they belonged to other organizations. SPMC's `contacts` is now an empty list.
- 12 placeholder doctor photos (`imageURL` is now empty for ids 1–11 and 13).

### Note for apps
Some text is now longer than before (one YAKAP benefit is 387 characters). Apps that check text length or require `true`/`false` may need to allow these values.

## 2026-11-10 · version `9bcd4cb` · first public release

### Added
- Public read-only API on a Cloudflare Worker (Workers Static Assets): 5 datasets, each with a JSON data file and a JSON Schema. `GET /` lists them.
- CI on every change: validate every file against its schema, run the Worker tests, deploy, smoke-test the live URL, and roll back automatically if the smoke test fails.
- JSON error responses with CORS, and a crash guard in the Worker.
- Images served from the repo at `/images/…` (AMUMA's image is the first).
- API docs: `/docs` (Swagger UI) and `/openapi.json` (OpenAPI 3.1).
- README as a full API reference.

### Tried and dropped the same day
- AWS S3, then Cloudflare R2, as the host (replaced by Workers Static Assets).
- An email of the update list on each data change (removed).
