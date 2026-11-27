# Accessibility

Cancer Open Data is for patients, caregivers and the apps that serve them. Many of them are tired, worried, older, or on an old phone with weak signal. Some use a screen reader, larger text or only a keyboard. This page says what the API does for them, what app builders should do, and what is not done yet.

Last reviewed: 16 November 2026. See also the [README](README.md) and the [API guide](API-GUIDE.md).

## What the API does

- **Text, not pictures of text.** Every value is plain text. No information is only in an image.
- **Words for missing values.** A `null`, empty text or empty list means "Not available". Apps can show those words instead of a blank or a lone dash.
- **Addresses as text.** Every place has a written `location`, not only a map point.
- **Values as written.** Times and dates are display text (`8:00 am`, `21 November 2025`), so a screen reader reads them the way the source wrote them.
- **Light and fast.** Each data file is small (the largest is under 60 KB), cached for 5 minutes, and supports `ETag` / `304`, which helps on slow or costly data.
- **No barriers to use.** No sign-up, no key, no CAPTCHA.
- **Readable without the docs page.** `/` (the dataset list), `/openapi.json` and every data file are plain JSON. The docs page at `/docs/` sets its language (English) and, without JavaScript, points to `/openapi.json`.

## Checklist for app builders

- **Images:** the image fields (`bgImageURL`, `imageURL`) have no alt text. Use the record's name as the alt text (for example `alt="SPMC Cancer Institute"`), or `alt=""` if the image is only decoration.
- **Missing values:** show "Not available" in words.
- **Maps:** don't show a place only as a pin. Show its `location` text too.
- **Phones and emails:** make them tappable (`tel:` and `mailto:` links) and readable as text.
- **Long text:** don't cut off requirements, steps or eligibility. Let people expand them.
- **Tap targets:** make buttons and links large enough to tap (44 × 44 px is a good size).
- **Text size and contrast:** support larger text and dark mode, and keep text contrast high.
- **Language:** most text is in English, and some names and posts are in Filipino or Visayan, as the source wrote them. Set your page's language (`lang="en"`).
- **Test:** try your app with TalkBack (Android) or VoiceOver (iPhone), and with the phone's largest text size.

## Known limits

- **The docs page uses Swagger UI,** a third-party tool. Some parts of it can be hard to use with a screen reader or keyboard. The same information is in `/openapi.json`, the README and the API guide.
- **No alt text field** for images yet.
- **Not audited yet.** The docs page has not been checked against WCAG. Our goal is WCAG 2.2 Level AA.
- **Source text is kept as written,** including the source's capital letters and typos, because we don't change values.

## Report a problem

If something in the API or the docs is hard to use, [open an issue](https://github.com/ProjectFuritsu/CancerOpenData/issues/new/choose) with the **API problem** form and start the title with **"Accessibility:"**. Tell us:

- the page or file,
- what you tried and what happened,
- your device, browser and any assistive tool you use (for example a screen reader).
