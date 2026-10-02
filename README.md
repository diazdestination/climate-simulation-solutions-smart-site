# Climate Simulation Solutions Smart Site

A Next.js App Router scaffold for Climate Simulation Solutions LLC, a local, family-owned HVAC and refrigeration business serving North Georgia. The design follows the [MogulForge discovery brief](https://docs.google.com/document/d/1h5EMSFodXCg0ldqBTyoyP6ajXY5P1lCR8AsFcPWVjJ4/edit): build trust quickly, then make **Book Service** effortless.

## Current scope

- Dark premium, responsive home page with clear service, emergency, maintenance, financing, and local area paths.
- Office-reviewed booking, estimate, maintenance, and emergency request forms.
- Server-side GrowthOS connection with validated saved receipts, encrypted durable retries, and explicit delivery status.
- Testimonial support that displays only approved real quotes. The list is intentionally empty.
- Search indexing disabled until launch approval and content review.

This is a private working integration candidate. No public deployment, domain, live credential or office acceptance is configured. Forms remain disabled until the private settings and versioned contact copy are approved and configured. A request is never described as a confirmed appointment.

## Local setup

Requires Node.js **22.13 or newer**, npm, and a persistent local disk. This candidate does not support Cloudflare Workers or ephemeral serverless filesystems.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local`. Open `http://localhost:3000`. Leave the env values blank for a safe preview; form delivery will be disabled.

## Checks

```bash
npm run lint
npm test
npm run build
npm run format:check
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_BUSINESS_PHONE` | Office-approved number shown as a call link. |
| `SITE_ORIGIN` | Exact approved HTTPS website origin; required for browser requests. |
| `GROWTHOS_API_ORIGIN`, `GROWTHOS_SITE_ID`, `GROWTHOS_SITE_SECRET` | Approved GrowthOS destination and site-scoped credential. |
| `GROWTHOS_JOURNAL_PATH`, `GROWTHOS_JOURNAL_ENCRYPTION_KEY` | Non-web-served persistent journal and separate 32-byte key. |
| `GROWTHOS_OPERATOR_TOKEN` | Separate credential for safe status, check, drain, and review-retry operations. |
| `GROWTHOS_CONTACT_POLICY_VERSION` | `css-request-contact-v1`, only after the displayed request-contact copy is approved. |
| `GROWTHOS_WORKER_ENABLED` | Explicit opt-in for the separately supervised retry worker. |

Never commit `.env.local`, journals or real credentials. See [GrowthOS integration](docs/GROWTHOS_INTEGRATION.md) for the implemented contract and [Runbook](RUNBOOK.md) for operation and remaining launch gates. `GROWTHOS_ALLOW_LOCAL=true` is only for synthetic loopback outside production.

## Project layout

- `src/app/`: Site routes and the request API handler.
- `src/components/`: Shared navigation, footer, and intake form.
- `src/lib/site.ts`: Approved public facts, services, areas, and testimonials.
- `src/lib/growthos-server.mjs`: Actual website mapping, origin/body/rate guards, and private operator handlers.
- `src/lib/website-adapter/`: Byte-identical reviewed GrowthOS adapter and source checksums.
- `scripts/growthos-worker.mjs`: Opt-in private retry worker; never installed automatically.
- `docs/`: Discovery summary and integration contract.
- `PROJECT_STATE.md`, `DECISIONS.md`, `NEXT_ACTIONS.md`, `RUNBOOK.md`: Durable project state.

## Before launch

The business must approve the logo, photos, service copy, phone number, hours, emergency response language, real testimonials, financing terms, maintenance terms, privacy policy, and deployment domain. Confirm the GrowthOS endpoint and office workflow, add abuse controls at the edge, test request delivery and office acknowledgement, complete accessibility and mobile review, then remove the temporary `noindex` metadata only with public launch approval.
