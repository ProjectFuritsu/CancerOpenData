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
   2. deploy:   upload only files that changed           (compares MD5 with S3 ETag)
   3. S3 keeps the old copy as a past version
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
5. **Give the role its permissions.** On the role → Add permissions → Create inline policy → JSON → paste `infra/permission-policy.json`. It can only read and write `*.json` files inside the folders of this bucket.
6. **Tell GitHub the role.** Copy the role ARN. In GitHub: repo → Settings → Secrets and variables → Actions → **Variables** tab → New variable:
   - Name: `AWS_ROLE_ARN`
   - Value: the role ARN, for example `arn:aws:iam::722399422980:role/github-cancer-open-data`

No AWS access keys are stored in GitHub. Actions gets short-lived credentials for each run.

## Files

| Path | What it does |
|---|---|
| `data/` | The datasets and schemas, same layout as the bucket |
| `scripts/validate.mjs` | Checks each data file against its schema (Ajv, draft 2020-12) |
| `scripts/upload-changed.sh` | Uploads only changed files, tagged with the commit |
| `.github/workflows/deploy-data.yml` | The pipeline |
| `infra/` | IAM and lifecycle policies to paste into AWS |
