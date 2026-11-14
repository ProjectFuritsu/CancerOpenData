# API guide

Everything an app needs beyond the [README](README.md): endpoints, images, responses, errors and the fields that can be empty.

**Base URL:** `https://cancer-open-data.capillanesjohnfritz.workers.dev` · **Scope:** Davao City (every record has at least one place in Davao City, or an online clinic for Davao City patients).

## Contents
- [Endpoints](#endpoints)
- [Images](#images)
- [Responses](#responses)
- [Errors](#errors)
- [Handling errors in your app](#handling-errors-in-your-app)
- [Values that can be empty](#values-that-can-be-empty)

## Endpoints

| Endpoint | Returns | Records key |
|---|---|---|
| [`/`](https://cancer-open-data.capillanesjohnfritz.workers.dev/) | List of all datasets | — |
| [`/Feeds/FeedsData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/Feeds/FeedsData.json) | News, blogs and articles about cancer care | `Feed` |
| [`/FinancialInstitution/FinancialInstiData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/FinancialInstitution/FinancialInstiData.json) | Financial institutions and their programs | `Financial_Insti` |
| [`/HealthInstitution/HealthInstiData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/HealthInstitution/HealthInstiData.json) | Health institutions and their services | `Health_Insti` |
| [`/MedicalSpecialist/MedicalSpecialistData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/MedicalSpecialist/MedicalSpecialistData.json) | Medical specialists and their clinics | `Medical_Specialist` |
| [`/SupportGroups/SupportGroupsData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/SupportGroups/SupportGroupsData.json) | Cancer support groups | `Support_Group` |
| `/images/<Folder>/<file>` | Images used by the data (see [Images](#images)) | — |
| [`/docs/`](https://cancer-open-data.capillanesjohnfritz.workers.dev/docs/) | Interactive API docs (Swagger UI): browse endpoints, see every field, try requests | — |
| [`/openapi.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/openapi.json) | OpenAPI 3.1 spec: imports into Postman, Insomnia or code generators | — |

Each data file has a schema next to it: replace `Data.json` with `Data.schema.json`, for example `/Feeds/FeedsData.schema.json` (JSON Schema draft 2020-12). The short names `FinancialInsti` and `HealthInsti` are on purpose: use the paths exactly as written.

**Use a plain GET with no custom request headers.** Any site can read the files (`Access-Control-Allow-Origin: *`). Cloudflare's static file layer doesn't answer CORS preflight (`OPTIONS` returns `405`), so adding headers like `Authorization` would make browsers block the request. Reading public JSON never needs them.

## Images

The image fields (`bgImageURL`, and `imageURL` for specialists) hold one of:

| Value | Meaning | In your app |
|---|---|---|
| `"/images/MedicalSpecialist/dr-santos.webp"` | An image hosted by this API | Put the base URL in front |
| `"https://…"` | An image on another site | Use as is (it may break if that site changes) |
| `""` | No image | Show a fallback, like initials or an icon |

```jsx
const imageUrl = (path) => !path ? null : path.startsWith("/") ? BASE + path : path;

{doctor.imageURL
  ? <img src={imageUrl(doctor.imageURL)} alt={`${doctor.firstname} ${doctor.lastname}`} loading="lazy" />
  : <div className="avatar">{doctor.firstname[0]}{doctor.lastname[0]}</div>}
```

`<img>` tags don't need CORS. Images also send `Access-Control-Allow-Origin: *`, so `fetch()` and `<canvas>` work too.

## Responses

`GET /` returns the dataset list:

```json
{
  "name": "Cancer Open Data",
  "about": "Public data on cancer care resources in one place. Each dataset has a JSON data file and a JSON Schema.",
  "source": "https://github.com/ProjectFuritsu/CancerOpenData",
  "version": "<commit that is live>",
  "datasets": [
    {
      "name": "Feeds",
      "data": "https://cancer-open-data.capillanesjohnfritz.workers.dev/Feeds/FeedsData.json",
      "size": 4784,
      "updated": "2026-11-10T10:35:27+08:00",
      "schema": "https://cancer-open-data.capillanesjohnfritz.workers.dev/Feeds/FeedsData.schema.json"
    }
  ],
  "usage": "fetch(\"https://cancer-open-data.capillanesjohnfritz.workers.dev/<Folder>/<File>.json\").then(r => r.json())"
}
```

`size` is in bytes. `updated` is the time of the last commit that changed the data file.

A data file is an object with `$schema` (path to its schema) and one records key that holds an array:

```json
{ "$schema": "./FeedsData.schema.json", "Feed": [ { "id": 1, "title": "…" } ] }
```

| Status | When |
|---|---|
| `200` | The file or the list |
| `304` | The file hasn't changed since your copy (sent `If-None-Match` with its ETag) |
| `404` | No such file. Folders like `/Feeds/` aren't listed |
| `405` | Any method other than GET or HEAD, including `OPTIONS` (see above) |
| `500` | Something broke on the server. Try again later |

Files are cached for 5 minutes (`Cache-Control: public, max-age=300`), and the list for 1 minute.

## Errors

Errors are JSON with CORS headers, so your app can always read them:

```json
{ "error": { "status": 404, "message": "Not found. See / for the list of datasets.", "path": "/Feeds/Nope.json" } }
```

`status` and `message` are always there. `404` adds `path`, and `405` adds `method`. The one exception is `OPTIONS` on a data file: Cloudflare's own `405` has no JSON body.

## Handling errors in your app

Check the status, set a timeout, retry once, and keep the last good copy so the app still works offline or during an outage:

```js
const BASE = "https://cancer-open-data.capillanesjohnfritz.workers.dev";

async function loadDataset(path, { retries = 1, timeoutMs = 8000 } = {}) {
  const cacheKey = `cod:${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
      if (res.status === 404) throw Object.assign(new Error("Dataset not found"), { fatal: true });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
      return { data, fromCache: false };
    } catch (err) {
      if (err.fatal || attempt === retries) {
        const saved = (() => { try { return localStorage.getItem(cacheKey); } catch { return null; } })();
        if (saved) return { data: JSON.parse(saved), fromCache: true };   // show "may be out of date"
        throw err;                                                        // show an error message
      }
      await new Promise(r => setTimeout(r, 1000));                        // wait, then retry
    }
  }
}

const { data, fromCache } = await loadDataset("/MedicalSpecialist/MedicalSpecialistData.json");
```

- **Don't retry `404`.** The path is wrong, so retrying won't help.
- **Network errors and timeouts** (`TypeError`, `TimeoutError`) and `5xx` are worth one retry.
- When `fromCache` is `true`, tell the user the data may be out of date.

## Values that can be empty

A `null`, an empty text or an empty list means the information is **not available yet**: show "Not available".

- **Can be `null`:** a service's `source`, a program's `source`, a clinic's `contacts`, `isWalkIns` and `canDoBoth`, a support group's `latitude`/`longitude`, `founder` and `socmedURL`.
- **Can be an empty list:** for example an institution's `contacts`.
- **Can be missing:** a specialist's `source`, a service's `service_schedule`.
- **Walk-in or appointment:** if `canDoBoth` is `true`, the clinic takes both. If `canDoBoth` is `false`, `isWalkIns: true` means walk-in only and `false` means appointment only. Any other case (a `null`) means not known: show "Not available". Check with `=== true` / `=== false`, because `null` is falsy and would otherwise read as "appointment only".
- **Don't add your own limits** on text length or values beyond what the schema says. A record that fails your app's own rules should not disappear without a sign.
