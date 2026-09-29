# Climate Simulation Solutions Smart Site

A Next.js App Router scaffold for Climate Simulation Solutions LLC, a local, family-owned HVAC and refrigeration business serving North Georgia. The design follows the [MogulForge discovery brief](https://docs.google.com/document/d/1h5EMSFodXCg0ldqBTyoyP6ajXY5P1lCR8AsFcPWVjJ4/edit): build trust quickly, then make **Book Service** effortless.

## Current scope

- Dark premium, responsive home page with clear service, emergency, maintenance, financing, and local area paths.
- Office-reviewed booking, estimate, maintenance, and emergency request forms.
- Server-side GrowthOS webhook boundary with validation and fail-closed delivery.
- Testimonial support that displays only approved real quotes. The list is intentionally empty.
- Search indexing disabled until launch approval and content review.

This is a working application scaffold, **not a launched site or live GrowthOS integration**. The forms remain disabled until the approved webhook URL and token are configured. A request is never described as a confirmed appointment.

## Local setup

Requires Node.js 20.9 or newer and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local`. Open `http://localhost:3000`. Leave the env values blank for a safe preview; form delivery will be disabled.

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

Never commit `.env.local` or real credentials. See [GrowthOS integration](docs/GROWTHOS_INTEGRATION.md) for the draft event contract and required provider verification.

## Project layout

- `src/app/`: Site routes and the request API handler.
- `src/components/`: Shared navigation, footer, and intake form.
- `src/lib/site.ts`: Approved public facts, services, areas, and testimonials.
- `src/lib/growthos.ts`: Server-side GrowthOS delivery boundary.
- `docs/`: Discovery summary and integration contract.
- `PROJECT_STATE.md`, `DECISIONS.md`, `NEXT_ACTIONS.md`, `RUNBOOK.md`: Durable project state.

## Before launch

The business must approve the logo, photos, service copy, phone number, hours, emergency response language, real testimonials, financing terms, maintenance terms, privacy policy, and deployment domain. Confirm the GrowthOS endpoint and office workflow, add abuse controls at the edge, test request delivery and office acknowledgement, complete accessibility and mobile review, then remove the temporary `noindex` metadata only with public launch approval.
