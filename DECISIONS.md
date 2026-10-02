# Decisions

## 2026-10-01 — Private GrowthOS website adapter

- Replace the draft `smart_site.lead_requested` hook with the actual GrowthOS server-only v1 site intake/check routes. Saved means a validated durable CRM receipt and office task, never an appointment.
- Preserve request identity across uncertain sends and reloads. Changed payloads cannot reuse an ID; a deliberate separate request requires an explicit visitor choice while the earlier request is uncertain.
- Store contact payloads only in an AES-256-GCM encrypted journal on a private persistent local volume. Keep keys outside the journal and browser. Remove saved ciphertext immediately and expire pending ciphertext after seven days.
- Use a Node >=22.13 candidate and pin the runtime requirement. No Cloudflare/serverless compatibility is claimed. A supervised worker/monitor, volume/backup owner, destination and actual office acceptance are deployment prerequisites.
- Version the exact request-only contact copy and require explicit unchecked consent. No SMS marketing or analytics consent is inferred. Preserve the source service/intent/time preference in the office summary.
- Vendor the reviewed reusable adapter byte-for-byte, with a digest test. Keep existing site branding, Book Service, emergency routing and pending-office-approval semantics.

## 2026-09-29 — Initial repository

- Use a private repository named `climate-simulation-solutions-smart-site`, consistent with Adam's lowercase, hyphenated product names.
- Use Next.js App Router, TypeScript, custom CSS, and a small dependency surface for the initial web app.
- Lead with trust and a persistent **Book Service** CTA; give emergency requests a distinct route.
- Model all appointments as office-approved requests. Success from the website means delivery to the intake endpoint, not confirmation of a time slot.
- Keep phone, assets, testimonials, exact financing terms, and maintenance details out of published copy until approved.
- Gate all lead delivery behind server-side secrets and HTTPS; disable forms when unconfigured.
- Keep `noindex` until public launch approval and content verification.
