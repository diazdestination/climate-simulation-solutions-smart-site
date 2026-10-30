# Decisions

## 2026-10-30 — Brand visuals

- Keep the original layout and copy; add visuals rather than restructure. A full-page cinematic 3D stage was tried and rejected because it read as space imagery, not an HVAC company.
- Every visual must be literal to the business or the logo: airflow, a fan, heat and cold, mountains. No abstract orbs or planets.
- Palette follows the supplied logo: navy base, sky blue accents, flame orange for the primary CTA so **Book Service** is the brightest element on every screen.
- Build the hero scene in-house with React Three Fiber and GSAP; no templates or stock video. Only the canvas is client-only, all copy stays server-rendered, and the original CSS visual remains the fallback.
- Do not put a CSS `transition` on `transform` for elements GSAP animates; the two conflict and freeze the animation.

## 2026-09-29 — Initial repository

- Use a private repository named `climate-simulation-solutions-smart-site`, consistent with Adam's lowercase, hyphenated product names.
- Use Next.js App Router, TypeScript, custom CSS, and a small dependency surface for the initial web app.
- Lead with trust and a persistent **Book Service** CTA; give emergency requests a distinct route.
- Model all appointments as office-approved requests. Success from the website means delivery to the intake endpoint, not confirmation of a time slot.
- Keep phone, assets, testimonials, exact financing terms, and maintenance details out of published copy until approved.
- Gate all lead delivery behind server-side secrets and HTTPS; disable forms when unconfigured.
- Keep `noindex` until public launch approval and content verification.
