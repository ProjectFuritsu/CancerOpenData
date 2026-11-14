# Images

Images here are served by the API at `/images/<Folder>/<file>`, for example
`images/MedicalSpecialist/dr-santos.webp` → `https://cancer-open-data.capillanesjohnfritz.workers.dev/images/MedicalSpecialist/dr-santos.webp`.

## Standard (use this for every new image)

| Kind | Folder | Shape and size | File name |
|---|---|---|---|
| Doctor photo | `MedicalSpecialist/` | Square **1:1**, up to **800 × 800** px | `dr-<first>-<last>.webp`, e.g. `dr-felycette-gay-lapus.webp` |
| Institution logo or building | `FinancialInstitution/`, `HealthInstitution/` | Wide **16:9**, up to **1200 × 675** px | `<name>.webp`, e.g. `philhealth.webp` |
| Support group logo or photo | `SupportGroups/` | Wide **16:9**, up to **1200 × 675** px | `<name>.webp`, e.g. `amuma.webp` |
| Feed cover | `Feeds/` | Wide **16:9**, up to **1200 × 675** px | `feed-<id>.webp`, e.g. `feed-1.webp` |

- **Format: WebP**, quality about 80. It is the smallest for the same quality, keeps transparency for logos, and works in every current browser.
- **Size:** aim under **200 KB** (photos) and **300 KB** (wide images).
- **Never enlarged:** a smaller original keeps its size (same shape). A logo far from 16:9 (tall or square) is padded with its own background color; one close to 16:9 is only trimmed at its plain edges.
- **Center the subject** so apps can crop to a circle (doctors) or a card (wide images).
- Other types still pass the check but get a warning. Convert them to WebP before adding.

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
