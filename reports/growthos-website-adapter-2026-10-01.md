# Private website adapter integration — 2026-10-01

## Scope and repository

Identity verified as `diazdestination`; fetched `origin`, verified clean main and origin/main at `b5867bb4d437b9f9caab4c09cf8f675d5dc3a8f3`, then created local branch `agent/growthos-website-adapter`. No commit, push, provider send, customer import, deployment or public launch was performed by this worker.

Implemented the actual GrowthOS site intake/check contract in the existing Book Service and emergency flow. The server uses the same reusable adapter as the GrowthOS repository, with byte-identical artifacts and SHA-256 manifest. Credentials stay on the server; request payloads are AES-256-GCM encrypted in a local SQLite journal before network delivery. Retry identity, destination, original receive time and consent evidence remain fixed.

The form now requires explicit versioned request-contact consent, has distinct saved/queued/review/unconfirmed states, recovers status after a reload using an opaque UUID only, and freezes the same-page payload for uncertain retries. Deliberate separate requests require an explicit visitor choice while the earlier one is uncertain. Saved acknowledgements clear form fields and the in-memory snapshot. Office confirmation remains separate.

## Verification

- `npm test`: **15/15 passed** (actual handler + real journal tests, bounded body-read timeout, artifact digests, worker disabled-by-default). Vendored artifact LF attributes preserve those digests across Windows/Linux checkouts.
- `npm run lint`: passed after using render state for retry availability.
- `npm run build`: passed on Node 24.19.0 / Next 16.3.7, including actual Node API routes.
- `npm run format:check`: passed.
- Actual Next browser test plus synthetic loopback GrowthOS receiver: **eight states**, desktop 1440 and mobile 390/320; zero axe WCAG A/AA violations, zero horizontal overflow, zero page errors and zero external requests. Four intended synthetic requests became four receiver records over six attempts.
- Browser exercised: keyboard consent, saved then reload, lost acknowledgement then queued/reload/status/drain, staffing hold then authenticated review retry, and lost browser response then immutable same-ID replay. No appointment confirmation was produced. Session storage contained only the UUID.
- Main adapter independently passes **18/18 tests**, including real HTTP redirect refusal, lost acknowledgement across process-handle restart, fencing/concurrency, key/destination isolation, cross-partition expiry, the live twentieth-attempt race, expiry during live attempts, actionable-first review and hard capacity. Independent review re-ran the canonical 18 and CSS 15 suites and found no remaining blocker.
- Production browser bundle scan found no server environment names, operator token handling or SQLite import. Gitleaks 8.30.1 scans of `src`, `scripts`, and `tests` found no leaks. No real secret values were used in tests.
- Impeccable detector ran once on the changed surface: it flagged pre-existing Arial, pre-existing status-card left border, and the pre-existing decorative grid. Those incumbent brand styles were preserved; the browser accessibility/overflow checks passed.

Local synthetic browser evidence: `.qa/browser-results.json` and `.qa/*.png` (ignored by Git). The helper preview and test journal were stopped/removed after the run.

## Real setup still required

Select and approve the Node persistent-volume host; this implementation is not Cloudflare/serverless compatible. Configure the exact public origin, real GrowthOS site credential, separately stored journal key/operator credential, approved consent copy, supervised worker, backup/restoration process, review alerts and shared edge abuse limit. Staff the inbox and verify an actual office response before real capture. Domain, phone, office hours and other unapproved company details remain unconfigured.

Pending ciphertext expires after seven days across every journal partition, and saved ciphertext is removed immediately. A live attempt may still record a saved acknowledgement within its bounded lease after ciphertext erasure; failure or lease expiry settles expired with no retained payload. Minimal receipt metadata is retained until reviewed disposal and hard capacity exhaustion rejects new requests visibly. Customer export/deletion must include this separate website journal; GrowthOS database export alone does not cover it.

The code is locally verified private engineering work. It is not evidence of a live provider connection or a public release.
