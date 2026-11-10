# Cancer Open Data

Data and JSON schemas for the cancer information system: cancer care resources in one place.

Edit the JSON here, push to `main`, and GitHub Actions checks it and uploads it to Cloudflare R2 (bucket `cancer-open-data`). No manual uploads.

## Data

Public read URL (testing): `https://pub-7d27b33e4bca41dc83569af8c2bb56c8.r2.dev/<folder>/<file>`

This `r2.dev` link is rate-limited and meant for testing. For the live app, add a custom domain to the bucket and use that instead.

| Folder | Data file | Records key |
|---|---|---|
| `Feeds/` | `FeedsData.json` | `Feed` |
| `FinancialInstitution/` | `FinancialInstiData.json` | `Financial_Insti` |
| `HealthInstitution/` | `HealthInstiData.json` | `Health_Insti` |
| `MedicalSpecialist/` | `MedicalSpecialistData.json` | `Medical_Specialist` |
| `SupportGroups/` | `SupportGroupsData.json` | `Support_Group` |

Each folder also has `<Name>.schema.json` (JSON Schema draft 2020-12). The short names `FinancialInsti` and `HealthInsti` are on purpose.

```js
const BASE = "https://pub-7d27b33e4bca41dc83569af8c2bb56c8.r2.dev"; // testing; switch to the custom domain for live
const { Feed } = await fetch(`${BASE}/Feeds/FeedsData.json`).then(r => r.json());
```

## How a change goes live

```
edit data/ → push or merge to main → GitHub Actions
   1. validate: every data file must pass its schema   (fails = nothing is uploaded)
   2. deploy:   upload only files that changed to R2     (compares MD5 with the ETag)
```

- **Pull requests** run the check only. Use them to review changes before they go live.
- **Each upload** gets the metadata `git-sha=<commit>`, so every file in R2 links back to a commit.
- **Cache:** files are served with `Cache-Control: public, max-age=300`, so apps see changes within about 5 minutes.
- **Nothing is deleted** from R2. If you remove a file here, delete it in R2 by hand.

Check locally before you push:

```bash
npm install
npm run validate
```

## Versioning and rollback

**Git is the version history.** R2 has no bucket versioning. Every change is a commit, with who, when, why and the exact diff. To roll back, run `git revert <commit>` and push; the pipeline uploads the old content again.

## Cloudflare R2 setup

R2 has 10 GB of free storage and free downloads.

**In the Cloudflare dashboard** (Storage & databases → R2):
1. **Create the bucket** `cancer-open-data`. Keep the default location and the **Standard** storage class.
2. **Public test link:** bucket → Settings → **Public Development URL** → Enable. This `https://pub-….r2.dev` link is rate-limited and for testing only. For the live app, add a **Custom Domain** (bucket → Settings → Custom Domains) on a domain in the same Cloudflare account, then turn the `r2.dev` link off.
3. **CORS:** bucket → Settings → CORS Policy → Add → JSON → paste `infra/r2-cors.json`.
4. **API token:** R2 → Overview → API Tokens → **Manage** → Create **Account API token** → permission **Object Read & Write**, limited to the bucket `cancer-open-data`. Copy the **Access Key ID** and **Secret Access Key** right away (the secret is shown once). Also copy your **Account ID** (32 characters, under Account Details).

**In GitHub:**

The 3 secrets live in the GitHub **Environment** named `R2_ACCESS_KEY_ID` (repo → Settings → Environments → `R2_ACCESS_KEY_ID` → Environment secrets). The deploy job uses that environment. The bucket name is a repository variable (Settings → Secrets and variables → Actions → Variables).

| Kind | Where | Name | Value |
|---|---|---|---|
| Secret | Environment `R2_ACCESS_KEY_ID` | `R2_ACCESS_KEY_ID` | Access Key ID from step 4 |
| Secret | Environment `R2_ACCESS_KEY_ID` | `R2_SECRET_ACCESS_KEY` | Secret Access Key from step 4 |
| Secret | Environment `R2_ACCESS_KEY_ID` | `R2_ACCOUNT_ID` | Your Cloudflare Account ID |
| Variable | Repository | `R2_BUCKET` | `cancer-open-data` |

Then run the workflow (Actions → Validate and deploy data → Run workflow). The first run uploads all 10 files. Later runs upload only changed files. If a setting is missing, the deploy job stops at once and names it.

- If a token leaks: delete it in Cloudflare, make a new one, and update the two key secrets.
- GitHub never passes secrets to pull requests from forks, and deploy runs only on `main`.

## Files

| Path | What it does |
|---|---|
| `data/` | The datasets and schemas, same layout as the bucket |
| `scripts/validate.mjs` | Checks each data file against its schema (Ajv, draft 2020-12) |
| `scripts/upload-changed.sh` | Uploads only changed files, tagged with the commit |
| `.github/workflows/deploy-data.yml` | The pipeline |
| `infra/r2-cors.json` | CORS policy to paste into R2 |
