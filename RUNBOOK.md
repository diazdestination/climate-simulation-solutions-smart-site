# Runbook

## Development and verification

Use Node >=22.13 (verified with 24.19.0), run `npm ci`, copy `.env.example` to `.env.local`, then run `npm run dev`. Blank settings safely leave forms disabled. Never configure a live account merely to preview the site.

Before integration: `npm run lint`, `npm test`, `npm run build`, `npm run format:check`. The vendored adapter checksum test prevents unnoticed divergence from its reviewed GrowthOS source. No external dependency or provider request is needed by these tests.

## Hosting boundary

This is a private Node runtime candidate requiring a persistent **local** filesystem. SQLite/WAL is not a Cloudflare Worker, ephemeral serverless, or network-share persistence solution. Approve the actual target before deployment. Restrict the volume and backup with service-account ACLs; never put the journal in a web-served directory. `public`, `.next`, `out`, and `dist` paths are rejected. `.local/`, SQLite and QA artifacts are ignored by Git.

Set the server-only settings from `.env.example` through the chosen secret store. The site-scoped GrowthOS credential, journal encryption key and operator token are distinct secrets. Do not print them, use query strings, log requests or copy them into browser variables. Keep the encryption key stable for the same journal; an incorrect key fails closed.

`SITE_ORIGIN` must equal the actual website HTTPS origin. The public route requires that exact `Origin`; it ignores spoofable forwarded-host values. Synthetic HTTP loopback is available only with `GROWTHOS_ALLOW_LOCAL=true` outside production. The default approved GrowthOS API origin is `https://app.mogulforge.ai`.

Approve the exact text in `src/lib/request-policy.mjs` before setting `GROWTHOS_CONTACT_POLICY_VERSION=css-request-contact-v1`. That checkbox covers phone and, when supplied, email about this request. It does not authorize marketing, text messages, or tracking.

## Connection and operations

`POST /api/internal/growthos` requires `Authorization: Bearer <GROWTHOS_OPERATOR_TOKEN>`, JSON, and no browser Origin. It accepts one of:

```json
{ "action": "check" }
{ "action": "inspect" }
{ "action": "drain" }
{ "action": "retry", "requestId": "the-existing-opaque-request-uuid" }
```

Use the operator credential from the secret store in an authorized server/CLI process. Never paste credentials into documentation or use a browser URL.

- `check` validates the site credential without creating a lead or activating capture. Its result is not proof of a deployed public form or current office staffing.
- Staff the GrowthOS organization with an active authorized responder. Review the GrowthOS launch checklist and explicitly activate capture there. Missing staffing, disabled capture, or a paused company yields a visible hold.
- `inspect` returns counts, capacity, and opaque held-request references/reasons. Actionable holds are listed before expired metadata; `reviewTotal` and `reviewTruncated` disclose the bounded 25-item list. It does not expose contact information, payloads, keys or filesystem paths.
- `drain` attempts up to five due records, with leased/fenced ownership to tolerate concurrent private workers.
- `retry` requires operator review of the upstream condition and reuses the original request ID, body, destination and receive time. A held record does not silently resume because the browser tries again.

## Automatic retries and monitoring

The private `growthos:health` and `growthos:backup` commands, restart template,
attention thresholds and recovery sequence are described in [ops/RECOVERY.md](ops/RECOVERY.md).
Health is read-only; backup uses SQLite's consistent backup API and requires Node
>=22.16. No supervisor, monitor or backup schedule has been installed.

Provision a supervised private process that runs `npm run growthos:worker` with the same server settings and `GROWTHOS_WORKER_ENABLED=true`. The script does not load `.env.local` itself: the host's service/secret configuration must provide its environment. It drains serially once per minute, exits safely on missing configuration/journal access, and logs counts only. No daemon or schedule is installed by this repository.

Alternatively, an authorized scheduler can call the authenticated drain endpoint. Establish restart/alert handling and office review before accepting real traffic. Watch `needs-review`, `expired`, queued age, worker failures, free disk and `totalRecords/capacity`. The in-process 120 requests/minute backstop covers public submission and lookup; the chosen host must add a shared cross-instance edge limit and appropriate abuse controls. Application JSON body reads have a five-second deadline and byte cap; trusted ingress still needs connection/header timeouts and request-size limits.

Network/uncertain receipt retries begin after 30 seconds and back off to one hour. Automatic retry stops after 20 attempts or three days without interrupting a live leased attempt. Pending ciphertext expires after seven days across every journal partition, including former destinations. An active lease may still settle a saved acknowledgement; a failed or abandoned attempt settles expired after erasure. Saved ciphertext is removed immediately. Minimal receipt/hash metadata is retained until reviewed disposal; the journal refuses intake at 10,000 records and has a 256 MiB SQLite page cap. Do not delete arbitrary metadata to free capacity: that discards local replay protection. Review an archive/migration procedure and the authoritative GrowthOS receipt retention first.

## Delivery states and recovery

| State | Meaning / action |
|---|---|
| `saved` | Actual GrowthOS receipt and office inbox task acknowledged. Appointment remains `pending_office_approval`. |
| `queued` | Encrypted local intake retained; office delivery unconfirmed. Worker may retry the same ID. |
| `needs-review` | Capture disabled/paused, missing responder, bad credential, rejection, retry exhaustion or expired payload. Review the cause; use the existing reference. |
| `unconfirmed` | Website could not establish current delivery state. Do not claim either office receipt or loss. |

The browser stores only the request UUID in session storage and polls by that opaque reference after a reload. It keeps an immutable in-memory snapshot for same-page uncertain retries, locks editing during that recovery, and permits a separate request only after the visitor acknowledges that the earlier request may still arrive. Contact data is never written to local/session storage. A successful acknowledgement clears the in-memory snapshot and form fields.

Public `POST /api/requests/status` is exact-origin and rate guarded and returns only the reference, state and office-approval status. It never returns internal CRM IDs or contact fields. An unknown reference is unconfirmed, not fabricated success.

Back up the journal using a SQLite-consistent process plus separate secret-store recovery for the encryption key. Restore the original API-origin/site identity and key before retrying. A different destination cannot drain the old partition. Validate recovery with synthetic requests and the authoritative GrowthOS deduplication receipt before admitting real work. Customer export/deletion must include this external volume; a main GrowthOS database export does not cover it automatically.

## Release

Keep the repository private and the site unindexed until `NEXT_ACTIONS.md` is complete and Adam authorizes public launch. Verify target account, repository, runtime, domain, secrets, office staffing and actual end-to-end acceptance before any release claim. No verified phone, hours or other missing business facts should be invented.
