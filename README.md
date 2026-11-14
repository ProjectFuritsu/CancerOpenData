<div align="center">

# 🎗️ Cancer Open Data

**Cancer care resources in Davao City, Philippines, in one free and open API.**<br>
Financial help, hospitals, specialists, support groups and news, as JSON with a schema for every file.

[![Validate and deploy data](https://github.com/ProjectFuritsu/CancerOpenData/actions/workflows/deploy-data.yml/badge.svg)](https://github.com/ProjectFuritsu/CancerOpenData/actions/workflows/deploy-data.yml)
[![API](https://img.shields.io/badge/API-live-2ea44f)](https://cancer-open-data.capillanesjohnfritz.workers.dev/)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-6BA539?logo=openapiinitiative&logoColor=white)](https://cancer-open-data.capillanesjohnfritz.workers.dev/openapi.json)
[![JSON Schema](https://img.shields.io/badge/JSON%20Schema-2020--12-blue)](https://json-schema.org/draft/2020-12)
[![Cloudflare Workers](https://img.shields.io/badge/hosted%20on-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/workers/static-assets/)

[**API**](https://cancer-open-data.capillanesjohnfritz.workers.dev/) ·
[**Docs**](https://cancer-open-data.capillanesjohnfritz.workers.dev/docs/) ·
[**API guide**](API-GUIDE.md) ·
[**Milestones**](MILESTONES.md) ·
[**Changelog**](CHANGELOG.md)

</div>

---

## 📦 What's inside

| | Dataset | Endpoint | Records key |
|---|---|---|---|
| 📰 | **Feeds**: news, blogs and articles | [`/Feeds/FeedsData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/Feeds/FeedsData.json) | `Feed` |
| 💰 | **Financial institutions** and their programs | [`/FinancialInstitution/FinancialInstiData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/FinancialInstitution/FinancialInstiData.json) | `Financial_Insti` |
| 🏥 | **Health institutions** and their services | [`/HealthInstitution/HealthInstiData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/HealthInstitution/HealthInstiData.json) | `Health_Insti` |
| 🩺 | **Medical specialists** and their clinics | [`/MedicalSpecialist/MedicalSpecialistData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/MedicalSpecialist/MedicalSpecialistData.json) | `Medical_Specialist` |
| 🤝 | **Support groups** and how to reach them | [`/SupportGroups/SupportGroupsData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/SupportGroups/SupportGroupsData.json) | `Support_Group` |

**Base URL:** `https://cancer-open-data.capillanesjohnfritz.workers.dev` · read-only, no keys, open to any website.
Also: [`/`](https://cancer-open-data.capillanesjohnfritz.workers.dev/) lists every dataset, each file has a schema next to it (`…Data.schema.json`), [`/docs/`](https://cancer-open-data.capillanesjohnfritz.workers.dev/docs/) is Swagger UI and [`/openapi.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/openapi.json) is the OpenAPI 3.1 spec.

> [!NOTE]
> **Scope: Davao City.** Every record has at least one office, clinic or group in Davao City, or an online clinic for Davao City patients. National programs (like PhilHealth) are listed with their Davao City office. A doctor's other clinics outside the city (for example in Tagum or Panabo) may also be listed.
>
> This data helps people find care and help. It is not medical advice. Values are copied as written from their sources; check with the institution before you go.

## 🚀 Quick start

```js
const BASE = "https://cancer-open-data.capillanesjohnfritz.workers.dev";

// One dataset
const { Medical_Specialist } = await fetch(`${BASE}/MedicalSpecialist/MedicalSpecialistData.json`).then(r => r.json());

// Everything, using the list at "/"
const { datasets } = await fetch(`${BASE}/`).then(r => r.json());
const all = await Promise.all(datasets.map(d => fetch(d.data).then(r => r.json())));
```

> [!IMPORTANT]
> **Use a plain GET with no custom request headers.** Cloudflare's static files don't answer CORS preflight, so a header like `Authorization` makes browsers block the request.

> [!WARNING]
> Use the paths exactly as written. The short names `FinancialInsti` and `HealthInsti` are on purpose.

## 🧾 Fields

Every record has an integer `id`. Each schema file has the full rules.

| Records key | Fields |
|---|---|
| `Feed` | `id`, `title`, `bgImageURL`, `category` (`News`, `Blog` or `Article`), `content`, `author`, `publishDate`, `source` |
| `Financial_Insti` | `id`, `name`, `bgImageURL`, `source`, `description`, `type`, `location`, `latitude`, `longitude`, `schedule` {`isWholeWeek`, `days`[]}, `contacts`[], `programs`[] (with `source`, `benefits`, `requirements`, `procedure`) |
| `Health_Insti` | Same as `Financial_Insti` up to `contacts`, then `services`[] (with `service_schedule`, `requirements`, `procedure`) |
| `Medical_Specialist` | `id`, `firstname`, `lastname`, `specialty`, `description`, `imageURL`, `source`, `clinics`[] {`clinicName`, `location`, `isWalkIns`, `canDoBoth`, `contacts`, `schedule`} |
| `Support_Group` | `id`, `name`, `description`, `type`, `socmedURL`, `bgImageURL`, `location`, `latitude`, `longitude`, `founder`, `contacts`[] |

> [!TIP]
> **A `null`, an empty text or an empty list means "not available yet".** Show "Not available", and don't add limits on text length or require `true`/`false` beyond what the schema says.

- **Time keys:** specialist clinics use `timeIN`/`timeOUT`; everywhere else it's `timeIn`/`timeOut`.
- **Dates and times are display text**, not ISO (`8:00 am`, `21 November 2025`).
- **Walk-in or appointment:** check with `=== true` / `=== false`, because `null` is falsy:

```js
const bookingMode = c =>
  c.canDoBoth === true ? "Walk-in and appointment"
  : c.canDoBoth === false && c.isWalkIns === true ? "Walk-in only"
  : c.canDoBoth === false && c.isWalkIns === false ? "Appointment only"
  : "Not available";
```

## 📚 More

| Read | For |
|---|---|
| [API-GUIDE.md](API-GUIDE.md) | Images, responses and status codes, errors, and error handling with retry and offline copy |
| [MAINTAINING.md](MAINTAINING.md) | How it's served, how a change goes live, rollback, changing the data, deploy setup |
| [MILESTONES.md](MILESTONES.md) | Where the project is going: v1 is live, v2 is being built |
| [CHANGELOG.md](CHANGELOG.md) | What changed in each version (`GET /` shows the live one in `version`) |

**Found wrong data, a missing resource or an API problem?** [Open an issue](https://github.com/ProjectFuritsu/CancerOpenData/issues/new/choose): there is a form for each, including privacy and removal requests.

---

<div align="center">
<sub>Made for patients, caregivers and the apps that serve them. Data from official and trusted sources, linked in each record.</sub>
</div>
