# Cancer Open Data

Data and JSON schemas for the cancer information system: cancer care resources in one place.

Edit the JSON here, push to `main`, and GitHub Actions checks it and uploads it to S3. No manual uploads.

## Data

Public read URL: `https://cancerdata-722399422980-ap-southeast-2-an.s3.ap-southeast-2.amazonaws.com/<folder>/<file>`

| Folder | Data file | Records key |
|---|---|---|
| `Feeds/` | `FeedsData.json` | `Feed` |
| `FinancialInstitution/` | `FinancialInstiData.json` | `Financial_Insti` |
| `HealthInstitution/` | `HealthInstiData.json` | `Health_Insti` |
| `MedicalSpecialist/` | `MedicalSpecialistData.json` | `Medical_Specialist` |
| `SupportGroups/` | `SupportGroupsData.json` | `Support_Group` |

Each folder also has `<Name>.schema.json` (JSON Schema draft 2020-12). The short names `FinancialInsti` and `HealthInsti` are on purpose.

```js
const BASE = "https://cancerdata-722399422980-ap-southeast-2-an.s3.ap-southeast-2.amazonaws.com";
const { Feed } = await fetch(`${BASE}/Feeds/FeedsData.json`).then(r => r.json());
```

## How a change goes live

```
edit data/ → push or merge to main → GitHub Actions
   1. validate: every data file must pass its schema   (fails = nothing is uploaded)
   2. deploy:   upload only files that changed           (compares MD5 with the ETag)
               to S3 and/or Cloudflare R2, whichever is switched on
   3. S3 keeps the old copy as a past version (R2: Git history only)
```

- **Pull requests** run the check only. Use them to review changes before they go live.
- **Each upload** gets the metadata `git-sha=<commit>`, so every S3 version links back to a commit.
- **Cache:** files are served with `Cache-Control: public, max-age=300`, so apps see changes within about 5 minutes.
- **Nothing is deleted** from S3. If you remove a file here, delete it in S3 by hand.

Check locally before you push:

```bash
npm install
npm run validate
```

## Versioning and rollback

Two layers:
1. **Git:** full history of every change. To roll back, `git revert <commit>` and push. The pipeline uploads the old content again.
2. **S3 Bucket Versioning:** S3 keeps past copies for 90 days (and always the last 10). In the S3 console, turn on "Show versions" on a file to see or restore one.

## One-time AWS setup

Do these once in the AWS console (account `722399422980`, region `ap-southeast-2`).

1. **Turn on bucket versioning.** S3 → bucket → Properties → Bucket Versioning → Edit → Enable.
2. **Add the lifecycle rule.** S3 → bucket → Management → Create lifecycle rule. Apply it to all objects. Choose "Permanently delete noncurrent versions": 90 days, keep 10 newer noncurrent versions. (`infra/lifecycle.json` has the same rule.)
3. **Add GitHub as an identity provider.** IAM → Identity providers → Add provider:
   - Type: OpenID Connect
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
4. **Create the role.** IAM → Roles → Create role → Custom trust policy → paste `infra/trust-policy.json`. Only the `main` branch of `ProjectFuritsu/CancerOpenData` can use this role.
   - This repo uses GitHub's **immutable subject** format, which includes the owner and repo IDs: `repo:ProjectFuritsu@189011255/CancerOpenData@1452119382:ref:refs/heads/main`. It keeps working if the repo is renamed, and a new repo with the same name can't use the role. To check the format, run `gh api repos/ProjectFuritsu/CancerOpenData/actions/oidc/customization/sub` and use its `sub_claim_prefix`.
5. **Give the role its permissions.** On the role → Add permissions → Create inline policy → JSON → paste `infra/permission-policy.json`. It can only read and write `*.json` files inside the folders of this bucket.
6. **Tell GitHub the role.** Copy the role ARN. In GitHub: repo → Settings → Secrets and variables → Actions → **Variables** tab → New variable:
   - Name: `AWS_ROLE_ARN`
   - Value: the role ARN, for example `arn:aws:iam::722399422980:role/github-cancer-open-data`

No AWS access keys are stored in GitHub. Actions gets short-lived credentials for each run.

> Note: on this AWS account, IAM identity providers need "advanced features" to be activated. Until then the S3 job can't log in, so it is switched off by leaving `AWS_ROLE_ARN` unset.

## Cloudflare R2 setup

The pipeline can also publish to Cloudflare R2 (bucket `cancer-open-data`). R2 has 10 GB free storage and free downloads.

Each target runs only when its repo variable is set: S3 needs `AWS_ROLE_ARN`, R2 needs `R2_BUCKET`. Remove a variable to switch that target off.

**In the Cloudflare dashboard** (Storage & databases → R2):
1. **Create the bucket** `cancer-open-data`. Keep the default location and the **Standard** storage class.
2. **Public test link:** bucket → Settings → **Public Development URL** → Enable. This `https://pub-….r2.dev` link is rate-limited and for testing only. For the live app, add a **Custom Domain** (bucket → Settings → Custom Domains) on a domain in the same Cloudflare account, then turn the `r2.dev` link off.
3. **CORS:** bucket → Settings → CORS Policy → Add → JSON → paste `infra/r2-cors.json`.
4. **API token:** R2 → Overview → API Tokens → **Manage** → Create **Account API token** → permission **Object Read & Write**, limited to the bucket `cancer-open-data`. Copy the **Access Key ID** and **Secret Access Key** right away (the secret is shown once). Also copy your **Account ID** (32 characters, under Account Details).

**In GitHub** (repo → Settings → Secrets and variables → Actions):

| Kind | Name | Value |
|---|---|---|
| Secret | `R2_ACCESS_KEY_ID` | Access Key ID from step 4 |
| Secret | `R2_SECRET_ACCESS_KEY` | Secret Access Key from step 4 |
| Secret | `R2_ACCOUNT_ID` | Your Cloudflare Account ID |
| Variable | `R2_BUCKET` | `cancer-open-data` |

Then run the workflow (Actions → Validate and deploy data → Run workflow). The first run uploads all 10 files. Later runs upload only changed files.

- **Versioning on R2 is Git only.** R2 has no bucket versioning like S3, so roll back with `git revert`.
- If a token leaks: delete it in Cloudflare, make a new one, and update the two secrets.

## Files

| Path | What it does |
|---|---|
| `data/` | The datasets and schemas, same layout as the bucket |
| `scripts/validate.mjs` | Checks each data file against its schema (Ajv, draft 2020-12) |
| `scripts/upload-changed.sh` | Uploads only changed files, tagged with the commit |
| `.github/workflows/deploy-data.yml` | The pipeline |
| `infra/` | IAM and lifecycle policies for AWS, CORS policy for R2 |
