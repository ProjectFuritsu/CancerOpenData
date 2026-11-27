# Security policy

## Supported versions

| Version | Supported |
|---|---|
| v1: the live API (`main` branch) | Yes |
| v2: in development, not public | Not yet |

## Report a vulnerability

**Please don't open a public issue.** Report it privately on GitHub: open the [private report form](https://github.com/ProjectFuritsu/CancerOpenData/security/advisories/new) (Security tab → **Report a vulnerability**). Tell us:

- what the problem is and where (a URL, file or workflow),
- the steps to see it,
- what someone could do with it,
- a fix, if you have one.

We aim to reply within 7 days. Fixes go through a pull request, and we credit you in the fix if you want.

## In scope

- The public API at `https://cancer-open-data.capillanesjohnfritz.workers.dev`: the Worker, the static files and their headers (CORS, cache, Content-Security-Policy).
- The `/docs/` page.
- The GitHub Actions workflows and the deploy setup, including how secrets are used.
- Personal data in the data files that should not be public.

## Please don't

- Run load or stress tests, or try to make the API slow or unavailable.
- Send spam, try social engineering, or test against people or offices.
- Access, change or delete other people's data or accounts.

## Personal data

If you find personal data that should not be public (for example a personal mobile number or a home address), report it **privately** with the form above, so it isn't repeated in a public issue. We remove it in the next deploy.

## Wrong or old data

Wrong data is not a security problem. Use the [issue forms](https://github.com/ProjectFuritsu/CancerOpenData/issues/new/choose) instead.
