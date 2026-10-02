# Project state — 2026-10-01

## Worker and recovery candidate

Branch `agent/growthos-worker-recovery` builds on the website adapter candidate
`0694ed5`. The worker now records private successful/stopped/failed heartbeats;
health checks detect stale workers, queue age and capacity without changing data.
An optional Node >=22.16 SQLite backup command creates verified consistent copies
with digests. See `ops/RECOVERY.md` and `reports/growthos-worker-recovery-2026-10-01.md`.
No supervisor, alert destination or backup schedule is installed. Local current
checks:19 tests, lint, types, build and format pass. Exact remote CI is recorded
in the draft PR/checks and Forge handoff after completion.

## Prior website adapter candidate

The private Smart Site now implements the real GrowthOS v1 server intake contract. Service forms preserve request identity, collect explicit request-contact permission, and distinguish office-saved, encrypted queued, held, and unconfirmed delivery. Reloads recover by opaque reference without storing contact details in session storage. Book Service and the separate emergency path retain pending office approval.

Verified locally: 15 Node tests, lint, production build, formatting, and eight browser states at 1440/390/320 px using the actual Next routes and synthetic loopback receiver. Browser evidence reports no axe A/AA violations, horizontal overflow, page errors, or external requests. Lost acknowledgements, reload recovery, explicit review retries, and no-duplicate replay passed. See [scope report](reports/growthos-website-adapter-2026-10-01.md).

Runtime is a private Node >=22.13 candidate with a persistent local SQLite volume and separately supervised worker. It is not a Cloudflare/serverless integration. No real endpoint credential, domain, business phone, customer asset, office acceptance or production deployment is configured. Search indexing stays disabled. `NEXT_ACTIONS.md` remains the launch checklist.
