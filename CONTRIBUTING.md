# Contributing

Thank you for helping. Cancer Open Data helps patients and caregivers in Davao City find cancer care and financial help, so every value must be correct and come from a source.

By taking part, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report wrong data, suggest a resource, report an API problem, or ask for removal:** use the [issue forms](https://github.com/ProjectFuritsu/CancerOpenData/issues/new/choose). No coding needed.
- **Fix or add data, docs or code:** open a pull request (see below).
- **Security problems:** report them privately (see [SECURITY.md](SECURITY.md)), not in an issue.

## Data rules (always)

- **Values as written.** Copy names, times, dates and amounts exactly as the source shows them. Don't fix, merge or reformat them.
- **A source for every value.** Official pages first (the institution's own site, `.gov.ph`). Put the link in the record's `source` field.
- **Never guess.** If a value is not known, use `null` or an empty list where the schema allows it.
- **Scope: Davao City.** Every record needs at least one office, clinic or group in Davao City, or an online clinic for Davao City patients.
- **No personal data** (Data Privacy Act, RA 10173): no personal mobile numbers, home addresses, personal emails or patient data. Doctor photos only with the doctor's consent.
- **No medical advice.** Write only what the source says.
- **News and articles:** title, author, date, link and a short summary in your own words. Never the full article.

## Make a pull request

1. Fork the repo and make a branch, for example `data/medicalspecialist-add-dr-santos-20261120`.
2. Install and check:
   ```bash
   npm install
   npm run validate
   ```
3. Make your change. For images, follow [images/README.md](images/README.md).
4. For code changes, also run the Worker tests:
   ```bash
   cd worker
   npm install
   npm test
   ```
5. Add a line to [CHANGELOG.md](CHANGELOG.md) under "Unreleased".
6. Open the pull request and fill in the template, including your sources.

CI checks every file against its schema and runs the tests. A maintainer reviews it. **Merging to `main` deploys to the public API** (apps see it within about 5 minutes), so please keep each pull request small and about one thing.

## Changing a schema

Apps rely on the schemas. Open an issue first, so we can agree on the change and tell the people who build on the API before it goes live. See [MAINTAINING.md](MAINTAINING.md#changing-the-data).

## v2

v2 is a new data shape in development and not public yet. For now, maintainers make the v2 changes. See [MILESTONES.md](MILESTONES.md).

## License

By contributing, you agree that your code is shared under the [MIT License](LICENSE) and your data under [CC0 1.0](LICENSE-DATA.md) (public domain).
