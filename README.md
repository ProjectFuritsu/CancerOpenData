# Cancer Open Data

Data and JSON schemas for the cancer information system: cancer care resources in one place.

Edit the JSON here, push to `main`, and GitHub Actions checks it and deploys it to a Cloudflare Worker. No manual uploads.

## Public API

**https://cancer-open-data.capillanesjohnfritz.workers.dev**

- `GET /` lists every dataset with its data URL, schema URL, size and last change.
- `GET /<Folder>/<File>.json` returns one file, for example `/Feeds/FeedsData.json`.

| Folder | Data file | Records key |
|---|---|---|
| `Feeds/` | `FeedsData.json` | `Feed` |
| `FinancialInstitution/` | `FinancialInstiData.json` | `Financial_Insti` |
| `HealthInstitution/` | `HealthInstiData.json` | `Health_Insti` |
| `MedicalSpecialist/` | `MedicalSpecialistData.json` | `Medical_Specialist` |
| `SupportGroups/` | `SupportGroupsData.json` | `Support_Group` |

Each folder also has `<Name>.schema.json` (JSON Schema draft 2020-12). The short names `FinancialInsti` and `HealthInsti` are on purpose.

```js
const BASE = "https://cancer-open-data.capillanesjohnfritz.workers.dev";
const { Feed } = await fetch(`${BASE}/Feeds/FeedsData.json`).then(r => r.json());
```

**Use a plain GET with no custom request headers.** Any site can read the files (`Access-Control-Allow-Origin: *`). Cloudflare's static file layer doesn't answer CORS preflight (`OPTIONS` returns `405`), so adding headers like `Authorization` would make browsers block the request. Reading public JSON never needs them.

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
   2. test-worker:  24 tests against a local copy of the Worker
   3. deploy:       build worker/dist from data/, then wrangler deploy
   4. smoke:        fetch every file from the public URL       (200, same bytes, CORS header, JSON type)
   5. email:        tell the update list what changed          (only if data changed and smoke passed)
```

- **Pull requests** run steps 1 and 2 only. Use them to review changes before they go live.
- **Each deploy switches all files at once.** There's no moment where some files are new and some old.
- **Cache:** apps see changes within about 5 minutes.
- **Removing a file** from `data/` removes it from the API on the next deploy.

Check locally before you push:

```bash
npm install
npm run validate
```

## Update emails

After a deploy that changed data and passed the smoke test, `scripts/notify-update.mjs` emails the update list. Before deploying, it saves the live data. After deploying, it compares that copy with `data/` and lists, per dataset, the record count before and after, plus which records were added, changed or removed (by name). It also gives the commit message, the diff link and the API link.

- **No change, no email.** Code-only deploys and re-runs send nothing.
- **Recipients are Bcc**, so they don't see each other. They're stored as a secret and never printed in the (public) logs.
- **A mail problem doesn't fail the deploy.** It shows as a warning, because the data is already live.
- Sent through a **dedicated Gmail account** (SMTP with an app password). Don't use a personal Gmail.

Try it without sending (prints the email):

```bash
PUBLIC_URL=https://cancer-open-data.capillanesjohnfritz.workers.dev node scripts/notify-update.mjs snapshot
DRY_RUN=1 node scripts/notify-update.mjs send
```

**Gmail setup (once):**
1. Create a new Gmail account just for alerts.
2. Turn on **2-Step Verification**: Google Account → Security.
3. Create an **app password**: Google Account → Security → 2-Step Verification → App passwords. Name it `cancer-open-data`. Copy the 16-character password.

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
| Secret | `SMTP_USERNAME` | The alert Gmail address |
| Secret | `SMTP_PASSWORD` | Its 16-character app password |
| Secret | `NOTIFY_EMAILS` | Who gets update emails, comma-separated |

Without the 3 email secrets, the email step only prints the email in the log, without recipients.

If a setting is missing, the deploy job stops at once and names it. GitHub never passes secrets to pull requests from forks, and deploy runs only on `main`.

## Working on the Worker

```bash
node scripts/build-site.mjs   # from the repo root: data/ -> worker/dist/
cd worker
npm install
npm test                      # 24 tests with Wrangler's local runner (real asset routing)
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
| `scripts/notify-update.mjs` | Emails the update list what changed |
| `worker/` | Worker config, the small script for `/`, and its tests |
| `.github/workflows/deploy-data.yml` | The pipeline |
