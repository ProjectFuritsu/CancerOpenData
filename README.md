# Cancer Open Data

Data and JSON schemas for the cancer information system: cancer care resources in one place.

Edit the JSON here, push to `main`, and GitHub Actions checks it and deploys it to a Cloudflare Worker. No manual uploads.

## Public API

**Base URL:** https://cancer-open-data.capillanesjohnfritz.workers.dev

Read-only, no keys, open to any website.

### Endpoints

| Endpoint | Returns | Records key |
|---|---|---|
| [`/`](https://cancer-open-data.capillanesjohnfritz.workers.dev/) | List of all datasets | — |
| [`/Feeds/FeedsData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/Feeds/FeedsData.json) | News, blogs and articles about cancer care | `Feed` |
| [`/FinancialInstitution/FinancialInstiData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/FinancialInstitution/FinancialInstiData.json) | Financial institutions and their programs (e.g. PhilHealth, SSS, GSIS, Pag-IBIG) | `Financial_Insti` |
| [`/HealthInstitution/HealthInstiData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/HealthInstitution/HealthInstiData.json) | Health institutions and their services (e.g. SPMC Cancer Institute) | `Health_Insti` |
| [`/MedicalSpecialist/MedicalSpecialistData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/MedicalSpecialist/MedicalSpecialistData.json) | Medical specialists (oncology and related fields) and their clinics | `Medical_Specialist` |
| [`/SupportGroups/SupportGroupsData.json`](https://cancer-open-data.capillanesjohnfritz.workers.dev/SupportGroups/SupportGroupsData.json) | Cancer support groups (e.g. AMUMA) | `Support_Group` |

Each data file has a schema next to it: replace `Data.json` with `Data.schema.json`, for example `/Feeds/FeedsData.schema.json` (JSON Schema draft 2020-12). The short names `FinancialInsti` and `HealthInsti` are on purpose: use the paths exactly as written.

### Using it

```js
const BASE = "https://cancer-open-data.capillanesjohnfritz.workers.dev";

// One dataset
const { Medical_Specialist } = await fetch(`${BASE}/MedicalSpecialist/MedicalSpecialistData.json`).then(r => r.json());

// Everything, using the list at "/"
const { datasets } = await fetch(`${BASE}/`).then(r => r.json());
const all = await Promise.all(datasets.map(d => fetch(d.data).then(r => r.json())));
```

**Use a plain GET with no custom request headers.** Any site can read the files (`Access-Control-Allow-Origin: *`). Cloudflare's static file layer doesn't answer CORS preflight (`OPTIONS` returns `405`), so adding headers like `Authorization` would make browsers block the request. Reading public JSON never needs them.

### Responses

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

### Errors

Errors are JSON with CORS headers, so your app can always read them:

```json
{ "error": { "status": 404, "message": "Not found. See / for the list of datasets.", "path": "/Feeds/Nope.json" } }
```

`status` and `message` are always there. `404` adds `path`, and `405` adds `method`. The one exception is `OPTIONS` on a data file: Cloudflare's own `405` has no JSON body.

### Handling errors in your app

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

### Fields

Every record has an integer `id`. Each schema file has the full rules. In short:

| Records key | Fields |
|---|---|
| `Feed` | `id`, `title`, `bgImageURL`, `category` (`News`, `Blog` or `Article`), `content`, `author`, `publishDate` (text like `21 November 2025`), `source` |
| `Financial_Insti` | `id`, `name`, `bgImageURL`, `source`, `description`, `type`, `location`, `latitude`, `longitude`, `schedule` {`isWholeWeek`, `days`[]}, `contacts`[], `programs`[] (with `benefits`, `requirements`, `procedure`) |
| `Health_Insti` | Same as `Financial_Insti` up to `contacts`, then `services`[] (with `service_schedule`, `requirements`, `procedure`) |
| `Medical_Specialist` | `id`, `firstname`, `lastname`, `specialty`, `description`, `imageURL`, `source` (optional), `clinics`[] {`clinicName`, `location`, `isWalkIns`, `canDoBoth`, `contacts`, `schedule`} |
| `Support_Group` | `id`, `name`, `description`, `type`, `socmedURL`, `bgImageURL`, `location`, `latitude`, `longitude`, `founder`, `contacts`[] |

Things that trip people up:
- **Time keys:** `Medical_Specialist` clinics use `timeIN`/`timeOUT`; everywhere else it's `timeIn`/`timeOut`.
- **Dates and times are display text**, not ISO (`8:00 am`, `21 November 2025`).
- **Can be `null`:** a service's `source`, a clinic's `contacts`, a support group's `latitude`/`longitude`.
- **Walk-in or appointment:** if `canDoBoth` is `true`, the clinic takes both. Otherwise `isWalkIns: true` means walk-in only, and `false` means appointment only.

## How it's served

The data files are **Workers Static Assets**: Cloudflare's edge serves them directly, without running any code.
- Requests for static files are free and don't count toward the Workers daily request limit.
- Files come from the Cloudflare location nearest each user.
- Headers (CORS, `Cache-Control: public, max-age=300`, `nosniff`) come from `worker/dist/_headers`. ETag and `304` work automatically.

The small Worker script (`worker/src/index.js`) runs only for `/` (the dataset list) and for paths with no file (`404`).

## How a change goes live

```
edit data/ → push or merge to main → GitHub Actions
   1. validate:     every data file must pass its schema     (fails = nothing is deployed)
   2. test-worker:  30 tests against a local copy of the Worker
   3. deploy:       build worker/dist from data/, then wrangler deploy
   4. smoke:        fetch every file from the public URL       (200, same bytes, CORS header, JSON type)
   5. rollback:     only if smoke failed: put the previous version back live
```

**Auto-rollback:** if a deploy goes live but fails the smoke test, CI runs `wrangler rollback`, so the last good version serves again within seconds. The run still ends red with a "Rolled back" error, so someone fixes the cause.

**Fire drill:** to prove rollback works, run the workflow by hand (Actions → Validate and deploy data → Run workflow) with **rollback_drill** ticked. It deploys, fails the smoke test on purpose and rolls back. The data stays the same, so users notice nothing.

- **Pull requests** run steps 1 and 2 only. Use them to review changes before they go live.
- **Each deploy switches all files at once.** There's no moment where some files are new and some old.
- **Cache:** apps see changes within about 5 minutes.
- **Removing a file** from `data/` removes it from the API on the next deploy.

Check locally before you push:

```bash
npm install
npm run validate
```

### Adding a new dataset

1. Make a folder in `data/`, for example `data/Hospice/`. Use letters, digits, `-` or `_`.
2. Add the schema `HospiceData.schema.json` (JSON Schema draft 2020-12) and the data file `HospiceData.json`.
3. Start the data file with `"$schema": "./HospiceData.schema.json"`. The check fails if this doesn't point to the schema next to it.
4. Run `npm run validate`, then push. The new dataset appears at `/` by itself, with no code change.

## Versioning and rollback

1. **Git:** every change is a commit with who, when, why and the exact diff. `git revert <commit>` and push redeploys the old data.
2. **Worker versions:** Cloudflare keeps every deploy. For an instant rollback without waiting for CI:
   ```bash
   cd worker
   npx wrangler deployments list
   npx wrangler rollback
   ```
   Then fix Git too, or the next push brings the bad data back.

`GET /` shows the deployed commit in `version`.

## Deploy setup

**In Cloudflare:** My Profile → **API Tokens** → **Create Token** → template **Edit Cloudflare Workers** → limit it to your account → **Create Token**. Copy the token (shown once).

**In GitHub** (repo → Settings → Secrets and variables → Actions):

| Kind | Name | Value |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | The token from above |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | `bc15d41433f443043305b72bec679e32` |
| Variable | `PUBLIC_URL` | `https://cancer-open-data.capillanesjohnfritz.workers.dev` (the smoke test checks this) |

If a setting is missing, the deploy job stops at once and names it. GitHub never passes secrets to pull requests from forks, and deploy runs only on `main`.

## Working on the Worker

```bash
node scripts/build-site.mjs   # from the repo root: data/ -> worker/dist/
cd worker
npm install
npm test                      # 30 tests with Wrangler's local runner (real asset routing)
npx wrangler login            # once per PC, only for a manual deploy
npx wrangler deploy           # manual deploy (CI does this on every push to main)
```

## Files

| Path | What it does |
|---|---|
| `data/` | The datasets and schemas |
| `scripts/validate.mjs` | Checks each data file against its schema (Ajv, draft 2020-12) |
| `scripts/build-site.mjs` | Builds `worker/dist/`: the data files, `index.json` and `_headers` |
| `scripts/smoke-test.sh` | Checks the public URL after each deploy |
| `worker/` | Worker config, the small script for `/`, and its tests |
| `.github/workflows/deploy-data.yml` | The pipeline |
