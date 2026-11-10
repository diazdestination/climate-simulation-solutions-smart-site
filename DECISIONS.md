# Decisions

## 2026-11-10 — Phone, hours, license and the living homepage (Adam, in Claude chat)

- **Phone: (706) 502-0877.** The CSS owner gave Adam this number for the site "until they say
  otherwise". It replaces (706) 809-5076 everywhere the site publishes a number (config, schema,
  llms.txt, privacy page). Open question for the owner: what happens to 809-5076 on the Google
  and Facebook listings, since mismatched numbers hurt local search.
- **Hours: Monday–Friday 9 a.m.–5 p.m., Saturday and Sunday 8 a.m.–6 p.m.**, as published on
  the old csshvacga.com site. Adam chose these over the Mon–Fri 7–5 recorded on 2026-10-14.
  `site.hoursSchedule` is now a list of day blocks so the open/closed badge covers weekends.
- **License no. 23196912** (from the owner via Adam). The owner did not say which board issued it
  or what class it is, and Georgia conditioned-air contractor numbers normally start with CN or
  CR, so the site prints "License no. 23196912" and names neither. Confirm the type before
  adding words such as "Georgia" or "conditioned air" next to it.
- **Reviews.** The homepage quotes five Google reviews word for word, copied from the old site
  (`site/src/content/reviews.js`), and links to the Google profile. No rating number or review
  count is published and no rating markup is emitted. Facebook and unattributed reviews from the
  old site are left out. The owner has not yet been asked to approve showing them.
- **"Insured" and "Locally owned" are not shown.** The old site published both, but neither
  has been confirmed with the owner and `site/src/content/pages.js` lists licensing and
  insurance wording as held until approved. Add them back only after the owner confirms.
- **Homepage hero.** The illustrative dusk photo is replaced by a canvas of moving air and a
  thermostat visitors can turn. It is labeled on the page as a demonstration. Symptom-first
  triage links replace the four path cards. The mobile bar now offers Call and Book service.
- **Design pass (same day).** Adam asked for the page to be reviewed against generic,
  template-looking patterns. Changed as a result: display type is Archivo set slightly wide in
  place of Manrope (one variable, `--display` in `site/src/styles.css`, plus one import in
  `main.jsx` to switch back); all-caps tracked labels above headings are gone or sentence case;
  services are a plain index without 01–05 numbers (they are not a sequence); the three request
  steps keep their numbers (they are); the orbit-ring logo panel is removed; the decorative
  radar is replaced by a true map (`site/src/content/area-map.js`: real bearings and distances,
  10/20/30-mile rings, the first eight approved call-to-check towns); the closing section sets
  the phone number as the largest type on the page; decorative arrows on buttons are removed.
  Rule for future work on this page: amber means warm air and blue means cool air, the hero is
  the only thing that moves, and every graphic shows something true.
- **Outdoor temperature.** `/api/outdoor` (in `site/worker/`) returns the National Weather
  Service hourly forecast temperature for Dawsonville, cached 15 minutes. The worker makes the
  request, so no visitor data reaches weather.gov and the privacy policy needs no new
  processor. Production currently runs an older server module that has no such route; until
  the worker is redeployed the hero shows a season line instead of a temperature.

## 2026-10-14 — Launch decisions "1c, 2 yes" (Adam, relayed in Claude chat)

- **Pre-GrowthOS email fallback (1c).** Until the CSS GrowthOS site record exists, web leads are
  emailed to the owners through the core email bridge (`emailBridge: { enabled: true,
  preGrowthOS: true }`, `wrangler.jsonc` `SMART_SITE_GROWTHOS_ENABLED: "false"`,
  `SITE_EMAIL_ENABLED: "true"`). Alerts go through **Resend** from the verified mogulforge.ai
  domain with the display name "MogulForge Lead Alerts" (Adam, 2026-10-14, "A is perfect").
  `RESEND_API_KEY`, the sender address and the owner addresses are secrets set by Codex, never
  committed. When Codex connects GrowthOS it sets
  `SMART_SITE_GROWTHOS_ENABLED=true` with the site ID/secret; from then on every lead goes to
  GrowthOS and the bridge cannot send (no double alerts). If email fails the form shows an error
  and the phone number; nothing is claimed as received. Retried requests keep the same `RQ-`
  reference so a duplicate alert is recognisable.
- **Privacy policy launches as a labeled draft (2 yes).** The `privacy-policy` release gate is
  `approved-draft` with `pendingReview` naming the attorney review. `release:check` passes only
  while `public/privacy/index.html` keeps the "Draft — pending attorney review" banner and
  `noindex`, and prints the pending review on every run. This is not an attorney approval: set
  the gate to `approved` only after the review.
- Preview hosts (`*.workers.dev` or `SITE_NOINDEX=true`) are always built noindex.

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
