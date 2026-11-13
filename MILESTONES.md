# Milestones

Where the Cancer Open Data API is in its development, and what comes next.
Last updated: 13 November 2026.

| # | Milestone | What it covers | Status |
|---|---|---|---|
| 0 | **Capstone data** | 5 datasets (feeds, financial institutions, health institutions, medical specialists, support groups), each with a JSON Schema | ✅ Done |
| 1 | **Public API (v1) live** | Cloudflare Worker; CI that validates, tests, deploys, smoke-tests and rolls back on failure; Swagger docs and OpenAPI | ✅ Done (10 Nov 2026) |
| 2 | **v1 growth and fixes** | 11 more specialists, a new support group, PhilHealth Z Benefits, real SPMC services; then fixes found in the v2 review (wrong contacts removed, placeholder photos cleared, short feed summaries, official Facebook pages, YAKAP from its official page, simpler Z Benefits steps) | ✅ Live (13 Nov 2026, version `8d206e1`) |
| 3 | **v2 design and build** | New data shape: branches, lists of sources, cancer types, separate amounts, booking type, eligibility as a list, `lastVerified`, one fixed list of contact types, "Not available" for any `null` value. No loans. PCSO (Medical Assistance Program) and DOH (MAIFIP) added | 🟡 Built and under review, not public yet |
| 4 | **Contract with apps** | Apps that read the API accept every value the schema allows. The schema states the limits apps rely on, so CI catches a mismatch before deploy | 🔴 In progress |
| 5 | **Data completeness** | Fill values that are not available yet (map points, contacts, booking info, office hours), correct source links, check photo consent | ⏳ Next |
| 6 | **v2 release** | v2 served at `/v2/` next to v1; v2 docs and tests; known users told before it goes live | ⏳ Planned |
| 7 | **Retire old v1 parts** | Remove the loan programs and old v1 files once apps read v2 | ⏳ Planned |
| ∞ | **Keep it healthy** | Monthly source recheck, deploy notifications, missing-data list | Ongoing |

## Notes
- **v1 stays stable while v2 is built.** v1 only gets fixes that fit its current fields, so apps that read it keep working.
- **v2 goes live at a new path** (`/v2/…`). The v1 files stay at the same links until apps have moved.
- A `null` or empty value means the information is **not available yet**. Apps should show "Not available".
