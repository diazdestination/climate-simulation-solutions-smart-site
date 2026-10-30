# Decisions

## 2026-10-30 — Cinematic 3D scroll intro

- Build the cinematic home page intro in-house with React Three Fiber, GSAP ScrollTrigger, and Lenis rather than a template or stock video loop: a shader scene is a few kilobytes, unique to the brand, and keeps the dark premium direction intact.
- Keep every word of copy in server-rendered HTML. Only the WebGL canvas is client-only, loaded with `next/dynamic` and `ssr: false` inside a client component.
- Progressive enhancement is mandatory: the same content renders as ordinary stacked sections for reduced-motion, data-saver, no-WebGL, and no-JavaScript visitors. A pre-paint inline script adds a `motion` class so entrance animations never flash their final state.
- Keep **Book Service** reachable at all times: the hero CTA stays above the fold and the nav bar is sticky.
- Use abstract thermal and airflow imagery, not equipment models, because no approved product or photo assets exist yet.
- Self-host Manrope and Instrument Serif through `next/font` so no browser requests go to Google.

## 2026-09-29 — Initial repository

- Use a private repository named `climate-simulation-solutions-smart-site`, consistent with Adam's lowercase, hyphenated product names.
- Use Next.js App Router, TypeScript, custom CSS, and a small dependency surface for the initial web app.
- Lead with trust and a persistent **Book Service** CTA; give emergency requests a distinct route.
- Model all appointments as office-approved requests. Success from the website means delivery to the intake endpoint, not confirmation of a time slot.
- Keep phone, assets, testimonials, exact financing terms, and maintenance details out of published copy until approved.
- Gate all lead delivery behind server-side secrets and HTTPS; disable forms when unconfigured.
- Keep `noindex` until public launch approval and content verification.
