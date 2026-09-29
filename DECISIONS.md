# Decisions

## 2026-09-29 — Initial repository

- Use a private repository named `climate-simulation-solutions-smart-site`, consistent with Adam's lowercase, hyphenated product names.
- Use Next.js App Router, TypeScript, custom CSS, and a small dependency surface for the initial web app.
- Lead with trust and a persistent **Book Service** CTA; give emergency requests a distinct route.
- Model all appointments as office-approved requests. Success from the website means delivery to the intake endpoint, not confirmation of a time slot.
- Keep phone, assets, testimonials, exact financing terms, and maintenance details out of published copy until approved.
- Gate all lead delivery behind server-side secrets and HTTPS; disable forms when unconfigured.
- Keep `noindex` until public launch approval and content verification.
