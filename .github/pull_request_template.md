<!-- Merging to main deploys data, image, docs-page and Worker changes to the public API. Keep each pull request small and about one thing. -->

## What changed

<!-- One or two sentences. Which records, files or features? -->

## Kind of change

- [ ] Data (`data/`, `images/`)
- [ ] Docs only (`*.md`; does not deploy)
- [ ] Code (`scripts/`, `worker/`, `docs/`, workflows)
- [ ] v2 (`data-v2/`, not public yet)

## Sources (for data changes)

<!-- Link the page each new or changed value comes from. Official pages first. -->

- 

## Checklist

- [ ] Values are copied as written from the source (names, times, dates, amounts)
- [ ] Every new or changed value has a source
- [ ] No personal data: no personal mobile numbers, home addresses, personal emails or patient data; doctor photos only with consent (RA 10173)
- [ ] No medical advice in descriptions
- [ ] `npm run validate` passes
- [ ] `cd worker && npm test` passes (code changes)
- [ ] Images follow [images/README.md](../images/README.md) (data changes with images)
- [ ] Schema change? App builders were told first ([MAINTAINING.md](../MAINTAINING.md#changing-the-data))
- [ ] [CHANGELOG.md](../CHANGELOG.md) updated under "Unreleased"
