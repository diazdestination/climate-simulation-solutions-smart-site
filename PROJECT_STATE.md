# Project state — 2026-10-30

Cinematic 3D scroll home page added on a feature branch pending review. The hero and a three-chapter intro (cooling, heating, every season) scroll over a sticky WebGL scene built with React Three Fiber: a shader thermal field, airflow particles, and a core orb whose colour shifts cold to warm with scroll. Lenis smooth scrolling and GSAP ScrollTrigger drive the choreography and below-the-fold reveals. Manrope and Instrument Serif are self-hosted through `next/font`. The nav bar with the **Book Service** CTA is now sticky.

Fallbacks: reduced-motion, data-saver, no-WebGL, and no-JavaScript visitors get the same copy as static sections over the original CSS visual. Particle count and pixel ratio drop on low-power devices. The scene pauses when scrolled off screen.

Verified in a headless Chromium at 1440 and 390 widths and in reduced-motion and no-JS modes: no horizontal overflow, no page errors, hero and nav CTAs visible, fallbacks render. Lint, type-check, and `next build` pass. Real-device frame rate and battery impact have not yet been measured. `npm audit` reports pre-existing advisories in Next.js 16.3.7 that this change does not introduce.

## 2026-09-29

Initial private GitHub repository scaffold. Built locally from the discovery brief. Home and interior routes render; the booking and emergency forms validate requests and forward them only when an approved HTTPS GrowthOS webhook and token are configured. The integration has not been tested against a live receiver. No domain, business phone, customer asset, or production deployment is configured. Search indexing remains disabled.

Verified locally: `npm run lint`, `npm run build`, and browser checks on desktop and mobile pass. The request API returns `400` for invalid input, `403` for cross-origin input, and `503` when delivery is unconfigured. See `NEXT_ACTIONS.md` for launch dependencies.
