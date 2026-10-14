# Decisions

## 2026-10-14 — React smart site launch decisions (Adam, relayed in Claude chat)

- **Office hours confirmed: Monday–Friday, 7 a.m.–5 p.m.** (Oct 9 owner interview). The older 9–5 in
  earlier intake docs and the HTML preview is superseded. Applied in `site/site.config.mjs`
  (`hours.summary`, `hoursSchedule`), the homepage FAQ and the assistant knowledge base.
- **Domain:** csshvacga.com is CSS's old domain (registered elsewhere, locked) and is not assumed.
  The production origin comes from `SITE_PUBLIC_ORIGIN` at build; Codex buys the approved new domain.
- **Assistant:** launch with a text-chat website assistant; spoken voice stays built in but off
  (`voice.modes.voice: false`) until CSS approves it. Live phone answering is post-launch.
- **Hero image:** the generated hero image is approved.
- **ElevenLabs:** a monthly budget cap is required (amount pending); agent limits set to 15
  conversations/day, 2 concurrent, 10-minute maximum, bursting off.
- **SMS:** no text consent until Telnyx 10DLC/toll-free registration and approved wording exist
  (`site/docs/sms-consent-telnyx.md`).

## 2026-10-09 — Existing GitHub repo and Cloudflare path

- Use the existing private `diazdestination/climate-simulation-solutions-smart-site`
  repository. Do not create a second CSS website repository.
- Preserve the owner-private ChatGPT Site and its project identity while
  preparing a separate Cloudflare candidate in `cloudflare/`.
- Base the design candidate on the exact Site version 8 source. Keep capture
  disabled and do not add a public Cloudflare route during repository preparation.
- Reconcile the October 9 owner interview with the older site intake before
  changing public hours, names, service-area claims, or contact promises.
- Keep GrowthOS tenant provisioning, durable request delivery, customer data,
  messaging, payments, and public domain release behind their own evidence gates.

## 2026-09-29 — Initial repository

- Use a private repository named `climate-simulation-solutions-smart-site`, consistent with Adam's lowercase, hyphenated product names.
- Use Next.js App Router, TypeScript, custom CSS, and a small dependency surface for the initial web app.
- Lead with trust and a persistent **Book Service** CTA; give emergency requests a distinct route.
- Model all appointments as office-approved requests. Success from the website means delivery to the intake endpoint, not confirmation of a time slot.
- Keep phone, assets, testimonials, exact financing terms, and maintenance details out of published copy until approved.
- Gate all lead delivery behind server-side secrets and HTTPS; disable forms when unconfigured.
- Keep `noindex` until public launch approval and content verification.
