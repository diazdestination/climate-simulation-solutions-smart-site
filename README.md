# HVAC Smart Site Front End

A ready-to-remix Next.js front end for HVAC smart sites. Dark premium design, a live WebGL hero that shows warm air pulled through a fan and leaving cool, scroll-in reveals, office-reviewed request forms, and a fail-closed GrowthOS intake boundary. The checked-in brand ("Northline Heating & Air") is a demo; follow [REMIX.md](REMIX.md) to fit a real client in about an hour.

## What is in the box

- Home page with hero airflow visual (React Three Fiber + custom shaders), ridgeline accent, service icons with a thermal hover, a gradient connector on the three steps, a pulsing emergency band, and GSAP scroll reveals.
- Interior routes: services and service detail, emergency service, maintenance, financing, service areas, about, reviews, book service.
- Progressive enhancement: reduced-motion, no-WebGL, and no-JavaScript visitors get a CSS visual and a fully static page. All copy is server-rendered.
- Request API that validates input, rejects cross-origin posts, and returns 503 until a webhook is configured.
- Testimonials render only from an approved list that ships empty.
- `noindex` until launch approval.

## Local setup

Requires Node.js 20.9 or newer and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Leave env values blank for a safe preview; form delivery stays disabled.

## Checks

```bash
npm run lint
npm run build
npm run format:check
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_BUSINESS_PHONE` | Office-approved number shown as a call link. |
| `GROWTHOS_LEAD_WEBHOOK_URL` | Approved HTTPS GrowthOS intake endpoint. |
| `GROWTHOS_LEAD_WEBHOOK_TOKEN` | Private bearer token for server-side delivery. |

Never commit `.env.local` or real credentials.

## Project layout

- `src/app/`: Routes and the request API handler.
- `src/components/`: Header, footer, intake form.
- `src/components/visuals/`: Hero airflow scene, shaders, brand icons, ridgeline.
- `src/components/motion/`: GSAP setup, scroll reveals, motion-preference detection.
- `src/lib/site.ts`: The single place for client facts.
- `src/lib/growthos.ts`: Server-side delivery boundary.
- `public/brand/`: Logo files.
- `REMIX.md`: Step-by-step brand swap.

## Before any launch

The client must approve logo, photos, copy, phone, hours, emergency wording, testimonials, financing and maintenance terms, privacy policy, and domain. Confirm the GrowthOS endpoint and office workflow, test request delivery, complete accessibility and mobile review, then remove `noindex` only with launch approval.
