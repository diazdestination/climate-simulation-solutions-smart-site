# Private website worker and recovery candidate

Branch: `agent/growthos-worker-recovery`, based on `0694ed5e47ec45a56f98af858d1d9b318ae468a5`.
This extends draft website-adapter PR1. No deployment, provider call, public form
activation, customer record or desktop setup occurred in this wave.

## Implemented

- Opt-in worker with bounded existing drains, atomic heartbeat, sanitized counts,
  prompt wait cancellation, failed/stopped state and journal closure.
- `growthos:health`: private read-only journal/heartbeat observation, queue age,
  capacity and needs-review status; nonzero exit when attention is needed.
- `growthos:backup`: optional Node >=22.16 consistent SQLite backup, private new
  destination, integrity check and checksum manifest. A successful copy explicitly
  does not claim restore acceptance or key/CRM receipt recovery.
- `ops/RECOVERY.md` and a review-only Linux supervisor template. No daemon, timer,
  alert recipient, approved host or backup retention policy is configured.

## Verification

Local checks passed:19 tests (15 existing request/adapter cases plus4 worker cases),
ESLint, TypeScript, Next production build and formatting. The exact vendored
operations helper was separately exercised by8 synthetic GrowthOS journal tests:
live WAL backup, wrong-key rejection, immutable replay identity, lost-ack receipt
deduplication, active-claim preservation, private paths, heartbeat/queue/capacity
warnings, read-only health and normalized-equivalent destination identity.

Independent review found and fixed normalization of origin/site ID before heartbeat
creation. The same canonical identity is now used by writes and reads. Review found
no remaining blocker within the worker, CLI and operations helper scope. Source
digests in `src/lib/website-adapter/SOURCE.json` match the reviewed bytes.

No site UI changed; the prior actual request-route/browser acceptance remains the
baseline in `growthos-website-adapter-2026-10-01.md`. Current remote CI belongs to
this candidate's draft PR and must be green before merging the stack.

## Remaining deployment acceptance

Select approved persistent Node hosting, domain and service account; supply secrets
privately; approve exact contact policy; accept office staffing and response; configure
supervision/alerts/backup retention; rehearse restore with separate key recovery and
matching CRM receipt history. Measure production RPO/RTO there. Keep intake unactivated
until the existing launch checklist and explicit public-launch authorization are met.
