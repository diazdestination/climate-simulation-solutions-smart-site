# CSS HVAC Cloudflare candidate

This is the Cloudflare deployment candidate for the existing private CSS Smart
Site. It imports the exact static design, browser code, and inactive GrowthOS
capture adapter from ChatGPT Site project
`appgprj_6ac90e8b97708191bcb6fb843a0c9c19`, version 8, source commit
`f4e4b154f792a7a8da2f09a82ab893356267eece` (October 9, 2026).
The ChatGPT Site remains the current owner-private demo; this copy has not been
deployed to Cloudflare or connected to a real CSS GrowthOS tenant.

## Local checks

From this directory:

```sh
npm ci
npm test
npm run check
npm run dev
```

`wrangler.jsonc` serves `dist/` as static assets and routes `/api/*` to the
Worker. `HVAC_CAPTURE_ENABLED` defaults to `false`, so `/api/capture-status`
reports disabled and the inquiry form stays hidden. `workers_dev` and version
preview URLs are disabled; this configuration defines no public route.
Do not add a route or enable capture as a shortcut to previewing the design.

## GrowthOS connection boundary

`worker/capture.js` contains the site-scoped request contract and synthetic
tests. It can forward only after all of its server-side settings validate.
Its current ambiguous-request behavior keeps the visitor's original request
ID on the page, but it has no durable server-side outage journal. That is a
release gap, not a reason to claim a saved request or expose the form now.
The older Next.js draft PRs implement a Node/SQLite journal and worker; their
local-filesystem persistence is not a Cloudflare Workers storage design.

Before any hosted request capture, approve the exact contact disclosure and
response channels, provision a new real CSS GrowthOS organization and active
office responder, choose an HTTPS host and server-only secret storage, design
durable uncertain-delivery handling, add abuse controls and operations alerts,
and run labeled synthetic HTTPS receipt and staff-task acceptance. The full
release checklist is in `worker/README.md`.

The owners said phone intake records name, service address, phone and email.
The imported version 8 web form currently asks for name, one contact channel
and ZIP code, and the v1 adapter has no service-address field. Resolve that
contract gap before making website requests available.

The October 9 owner interview is recorded at
`C:\Forge\CSS_OWNER_INTAKE_2026-10-09.md`. It describes weekday hours as
"seven to five"; the current website displays 9am–5pm. Confirm the correct
hours and name spelling before changing customer-facing copy. The requested
new service-area pages need approved coverage boundaries and local proof.
Housecall Pro migration, payment collection, and automated messaging are
separate GrowthOS workstreams and are not delivered by this website candidate.

## Source discipline

The Site source remains a separate Git repository. Update this directory from
a verified Site commit, record its SHA, review the diff, and preserve the
approved logo bytes. Keep this GitHub repository as the review and eventual
Cloudflare deployment source. Do not overwrite a newer Site revision with an
older snapshot.

\n