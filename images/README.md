# Images

Images here are served by the API at `/images/<Folder>/<file>`, for example
`images/MedicalSpecialist/dr-santos.webp` → `https://cancer-open-data.capillanesjohnfritz.workers.dev/images/MedicalSpecialist/dr-santos.webp`.

## Rules (checked by `npm run validate`)

- **One folder per dataset:** `Feeds/`, `FinancialInstitution/`, `HealthInstitution/`, `MedicalSpecialist/`, `SupportGroups/`. No files loose in `images/`, no sub-folders.
- **File names:** lowercase letters, digits, `-`, `_`, `.`. Example: `dr-maria-santos.webp`.
- **Types:** `webp` (best), `avif`, `png`, `jpg`/`jpeg`, `gif`. No SVG (it can carry scripts).
- **Size:** under 500 KB is best (larger gives a warning); over 5 MB fails. Aim for WebP about 1200 px wide.
- **Use it in the data** with a path that starts with `/images/`:
  ```json
  "imageURL": "/images/MedicalSpecialist/dr-maria-santos.webp"
  ```
  The check fails if the file doesn't exist, and warns about images no data file uses.

## Before you add a photo

- **People:** only with their consent. Don't use placeholder or stock faces for real doctors: leave the field `""` and let the app show initials.
- **Logos and photos from other sites:** only if you have permission (or the source allows reuse). Credit the source where needed.
- Git keeps every version of every image forever, so compress first.
