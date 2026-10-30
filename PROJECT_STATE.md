# Project state — 2026-10-30

Brand visual upgrade on a feature branch pending review. The original page layout and copy are unchanged. Additions: the supplied logo in the header and as the site icon; a palette shift from mint to the logo's sky blue, with flame orange for the primary **Book Service** button; a live WebGL hero visual in the original right-hand slot showing warm air pulled through a fan and leaving cool, lit in orange and blue; North Georgia ridgelines under the hero; service icons with a thermal gradient hover; a gradient connector that draws in on the "How it works" steps; a pulsing emergency ring; GSAP scroll reveals; Manrope and Instrument Serif self-hosted through `next/font`; a sticky nav bar.

Fallbacks: reduced-motion, no-WebGL, and no-JavaScript visitors see the original CSS orb and static sections. Particle counts and pixel ratio drop on low-power devices and the scene pauses off screen. An earlier full-page cinematic stage (PR #5) was closed as off-brand.

Verified in headless Chromium at 1440 and 390 widths plus reduced motion: no horizontal overflow, no page errors, CTAs visible, fallbacks render. Lint, type-check, format check, and `next build` pass. Real-device performance is not yet measured. `npm audit` reports pre-existing advisories in Next.js 16.3.7.

## 2026-09-29

Initial private GitHub repository scaffold. Built locally from the discovery brief. Home and interior routes render; the booking and emergency forms validate requests and forward them only when an approved HTTPS GrowthOS webhook and token are configured. The integration has not been tested against a live receiver. No domain, business phone, customer asset, or production deployment is configured. Search indexing remains disabled.

Verified locally: `npm run lint`, `npm run build`, and browser checks on desktop and mobile pass. The request API returns `400` for invalid input, `403` for cross-origin input, and `503` when delivery is unconfigured. See `NEXT_ACTIONS.md` for launch dependencies.
