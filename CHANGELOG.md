# Changelog

What changed in the Cancer Open Data API, newest first.
The API's version is the deployed Git commit: `GET /` returns it in `version`.
Dates are Philippine time (UTC+8). See [MILESTONES.md](MILESTONES.md) for the bigger plan.

## Unreleased

### Data
- Specialist #12 (Michael Jonathan Latayan): his SeriousMD profile link was in `imageURL` and he had no `source`. `imageURL` is now empty (no photo without consent) and `source` is `https://seriousmd.com/doc/mlatayan` (issue #10).
- Specialist #12: clinic "Latayan Urology Clinic DMSF" is now "Davao Medical School Foundation Hospital", as his SeriousMD page names it (checked 2026-11-16). His 3 clinics' schedules and booking already matched the page.
- AMUMA: removed the landline (082) 295-2133. PhilHealth's official directory lists it as PhilHealth Regional Office XI's trunkline.
- SSS (Financial #2): `bgImageURL` is now empty. The old link (https://www.sss.gov.ph/sss/images/SSS_Building.jpg) returns 404 (checked 2026-11-27). Apps show no background image until an official one is found.
- Red Planet Davao (Accommodation #4): `cost` is now "Estimated ₱1,764 to ₱2,200 per night (as of 27 November 2026)" (regular rate, 2 adults, 1 room, total incl. taxes and fees, checked on the official booking engine for the night of 10 December 2026); `roomCapacity` 2 to 2; 12 `amenities` and the photo link from the official page; map point 7.0994106, 125.6212232 (checked by Fritz on Google Maps); description notes the Senior Citizen & PWD rate. Booking engine added to `sources`.
- Hop Inn Hotel Davao (Accommodation #5): `cost` is now "Estimated ₱1,800 to ₱3,000 per night (as of 27 November 2026)" (Best Flexible Rate, 2 adults, 1 room, Standard to Triple, official booking engine, night of 10 December 2026; taxes not shown); `roomCapacity` 2 to 3 (adults, as the official page writes "up to 2 adults and 1 child" and "up to 3 adults and 1 child"); landmark, 5 `amenities` and the photo link from the official pages; map point 7.0979918, 125.6186796 (checked by Fritz on Google Maps); description notes the Senior Citizen rate. Booking engine added to `sources`.
- Seda Abreeza (Accommodation #6): `cost` is now "Estimated ₱6,605 to ₱14,267 per night, excluding taxes and fees (as of 27 November 2026)" (regular Flexible Rate, 2 adults, 1 room, Standard room only to One-Bedroom Suite with breakfast, official booking engine, night of 10 December 2026; the engine shows prices without taxes and fees); `roomCapacity` 4 to 4 (every room type says "Sleeps 4"). Landmark "Beside Abreeza Mall" and map point 7.0894738, 125.6076706 (both given by Fritz, map point checked on Google Maps). Booking engine added to `sources`.

### Repo: v2 is the main version
- MAINTAINING.md: rules for facts with no link (personal communication): who counts, what to write down, how the CHANGELOG cites them, privacy, proof, conflicts and rechecks.
- v1 and v2 are both labeled **beta**: the docs picker shows "v1 (beta)" and "v2 (beta)", each OpenAPI title says "(beta)", and `GET /` and `GET /v2/` have `"status": "beta"` (v2 was "preview"). `GET /` also gets `"apiVersion": "v1"`. Nothing else changes: same links, same data.
- `data-v2/` is now the source of truth: v2 is edited directly, and validate and the Worker tests require it. `data/` (v1) is frozen and stays online read-only until a stop date is agreed. `scripts/convert-v2.mjs` is frozen (it stops unless run with `--unfreeze`); its last run after PR #18 changed nothing.

### v2 (in development, not public)
A new data shape, to be served at `/v2/…` next to v1. Not live yet; v1 is unchanged by it.
- Institutions get `branches` (address, map point, hours and contacts per office).
- Lists of `sources` and `cancerTypes`, and one fixed list of contact types. (Records have no `lastVerified`; each file's `meta.lastUpdated` says when its records last changed.)
- Benefit `amount` separate from the benefit name; clinic `bookingType` instead of `isWalkIns` and `canDoBoth`; `eligibility` as a list.
- No loan programs. New: PCSO (Medical Assistance Program) and DOH (MAIFIP).
- Feeds: 6 posts from the Philippine Society of Medical Oncology (psmo.ph): NCCN's locally adapted treatment guidelines, PANAG-ISTORYA (Davao City), the National Cancer Alliance, Barangayan in Gingoog City, "Ano ang Sarcoma?" and the 1st National Patient Navigation Conference. Titles, authors and dates as written; short summaries in our own words, with a link to each post.
- Feeds: 7 Davao City cancer news posts (2025–2026) from the City Government of Davao, SunStar Davao, MindaNews and the Daily Tribune: free cervical and breast cancer screening in health centers, breast and cervical cancer deaths, child cancer treatment at SPMC, SPMC's stereotactic radiosurgery, and a Malasakit Center patient story. Same rules.
- Health institutions: "SPMC Cancer Institute" is renamed "Southern Philippines Medical Center", since its cancer clinics are in several departments. It gets its official site as source, its main contacts, and 8 department cancer clinics with schedules (adult oncology and hematology, surgical oncology, gynecologic oncology, trophoblastic clinic, colposcopy and Pap smear, pediatric oncology, breast imaging). New: Davao Doctors Hospital with 6 cancer services (radiation oncology, external beam radiation, brachytherapy, in-patient chemotherapy, radioactive iodine therapy, long-term radiotherapy). Sources: spmc.doh.gov.ph and ddh.com.ph.
- SPMC fees for radiation therapy, the adult cancer unit (room and board, average chemotherapy fees) and breast imaging, as written in SPMC's official Rates and Fees PDF (tables as of August 31, 2022). The PDF is listed in each service's sources.
- Where to go for financial help, from official directories: PhilHealth's LHIO Davao City, PhilHealth Express Calinan and Toril, and the Gaisano Mall service desk, plus the eGovPH Super App (YAKAP's apply-online link); PCSO's Davao City office, its Online MAP Application link, and a first step listing the online, office and hospital Malasakit options; DOH MAIFIP at the hospital's Malasakit Center or Medical Social Work Unit, or online through eMAIFIP in the eGovPH app (PTV News and PNA, August–September 2026).
- Support groups: removed (082) 295-2133 from AMUMA. PhilHealth's directory lists it as PhilHealth Regional Office XI's trunkline.
- Support groups: AMUMA `founders` is Dr. Jose Beltran only, as given by the maintainer (Fritz, 2026-11-27; not from a published source). The two news articles in its `sources` name Dra. Margaret P. Domingo and Fr. Albert E. Alejo, S.J. as co-founders and Dr. Beltran as President; they stay in `sources` for the record's other facts.
- PhilHealth Z Benefits is one program (`Z Benefits`) instead of five. Every benefit and amount, every eligibility rule and each cancer's description from v1 is kept, labeled with its cancer (for example "Breast Cancer (cStage 0 to IV): Total package").
- A `null` or empty value means "Not given".
- Served at `/v2/` next to v1: the files at `/v2/<Folder>/<File>.json`, the dataset list at `GET /v2/`, and its own spec at `/v2/openapi.json`. v1 paths don't change.
- The docs page has a version picker (v1 or v2); `/docs/?version=v2` opens v2.
- DOH programs: Cancer Assistance Fund (CAF, up to P150,000 for 8 priority cancer types; Southern Philippines Medical Center is the Davao City access site) and CSPMAP (free cancer medicines not yet covered by PhilHealth). Sources: DOH-DBM Joint Memorandum Circular 2023-001, the DOH-WHO release of 14 February 2024, and news.
- PCSO has one branch, the "Davao City Branch", and DOH's office branch is the "DOH Office Davao City" (names chosen by the maintainer).
- Feeds 16 to 18: PhilHealth's lists of hospitals contracted for Z Benefits, accredited cancer screening providers and accredited YAKAP clinics, all as of September 30, 2026, with the Davao City facilities in each summary.
- Health institutions get `coverage`: the programs each hospital accepts or is accredited for. Each item has a `programID` that links to a financial program, or `null` when that program isn't in the API.
- New dataset `Accommodation` (`/v2/Accommodation/AccommodationData.json`): places where patients and companions can stay near the hospitals. Each place has a type, operator, cost, `amenities` (a list, as written), `roomCapacity` (people per room as a range: `min` and `max`, each a whole number or `null`), contacts, sources, and branches with address, landmark and map point; who can stay is in the description. Apps can sort them by distance from a hospital using the branches' `latitude` and `longitude` (filled in as GPS readings come in). For now: 7 paid hotels and inns a few minutes from SPMC (Red Planet Davao, Hop Inn, Seda Abreeza, Park Inn by Radisson, Acacia) or Davao Doctors Hospital (Rogen Inn, Apo View Hotel). RedDoorz, D'Morvie Suites and The Bourke Hotel were dropped: only booking-site listings, no official or news source. Free shelters and halfway houses will be added after the maintainer talks with them. Every place has at least one source. Landmarks for Red Planet and Park Inn, as written by their own pages.
- Accommodation: contacts added for 6 places that had none, as written on each source: Hop Inn, Seda Abreeza, Park Inn by Radisson, Acacia Hotel and Apo View (official hotel pages; new sources: the Seda, Acacia and Apo View contact pages) and Rogen Inn (SunStar, 2022; no website). Every place to stay now has at least one contact.
- Every branch (financial offices, hospitals, places to stay) gets `landmark`: a landmark that helps people find it, as written, or `null`. Addresses that already include a landmark stay as written. `latitude` and `longitude` are described as decimal degrees from an official source or an on-site GPS reading.
- Every v2 file starts with a `meta` block: title, description, `apiVersion`, `lastUpdated` (the date its records last changed, Philippine time), `recordCount`, coverage, language, license (CC0-1.0) with its link, publisher, contact (GitHub issues) and the schema path.
- **All v2 keys are camelCase**, with `ID` and `URL` kept upper case (as in `programID` and `imageURL`). Records keys: `feed`, `financialInsti`, `healthInsti`, `medicalSpecialist`, `supportGroup`, `accommodation`. Inside records: `contactID`, `contactDetails`, `programName`, `programDescription`, `benefitID`, `benefitName`, `requirementID`, `requirementDescription`, `serviceName`, `serviceDescription`, `serviceSchedule`. v1 keeps its old names.
- **Every source is a `sources` list** (links, no repeats). Feeds, financial and health institutions had one `source` link; places to stay had both `source` and `sources`. Feeds and institutions must have at least one link; elsewhere an empty list means "Not given". Values are unchanged.
- Specialists: no SeriousMD page gives a booking type for an online clinic, so all 9 online clinics have `bookingType` `null`.
- DOH programs use official sources instead of news: the DOH Malasakit Program Office pages (MAIFIP requirements, how to apply, eMAIFIP access sites), DOH Davao's Citizen's Charter 2025, and DOH's own releases on CAF and CSPMAP. Facts that only news gave are removed until an official source is found: MAIFIP's "no fixed cap" and 12-working-day payment, applying through the eGovPH app, and CAF's "up to P150,000" (both amounts are now "Not given").
- Display rule for apps: when a program's or service's `requirements` or `procedure` is empty, show "Not given yet. Visit the facility and ask the staff in charge (for example the social worker or the help desk) about the requirements." (or "…about the steps."). The text is in the schemas and the v2 OpenAPI spec; the data stays empty, so the missing-data list still shows these gaps.
- Same display rule for an empty money-help `eligibility`: show "Not given yet. Visit the facility and ask the staff in charge (for example the social worker or the help desk) about who can apply." (first used by DOH's CSPMAP, 606003).
- DOH has one branch, the Malasakit Center (beside SPMC). The "DOH Office Davao City" branch (PRRD Bldg) is removed: DOH's MAIFIP steps send patients to the Malasakit Center, and no listed source says to apply at that office. MAIP is written MAIFIP everywhere.

### Repo
- Issue forms: wrong data, new resource, API problem, privacy or removal request. Blank issues are off.
- Pull request template: every pull request starts with the kind of change, its sources, and a checklist of the data rules (values as written, a source for every value, no personal data, no medical advice) and checks (validate, Worker tests, images, schema notice, changelog).
- [ACCESSIBILITY.md](ACCESSIBILITY.md): what the API does for accessibility, a checklist for app builders, known limits (the docs page is not audited yet; the goal is WCAG 2.2 Level AA), and how to report a problem.
- **License:** code under the [MIT License](LICENSE); data in the public domain under [CC0 1.0](LICENSE-DATA.md). Logos and photos in `images/` stay with their owners.
- [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) (private reports through GitHub's private vulnerability reporting, now turned on) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) (Contributor Covenant 2.1).
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
