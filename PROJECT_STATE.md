# Project state — 2026-11-10

## Living homepage candidate (branch `claude/css-living-hero-20261110`)

Built on `codex/css-discovery-20261109` (the source of the live frontend). Not merged and not
deployed: csshvac.com is unchanged. See the 2026-11-10 entry in `DECISIONS.md` for what changed
and why. Verified locally in `site/`: `npm test` 56 passed, 1 skipped, 0 failed;
`SITE_PUBLIC_ORIGIN=https://csshvac.com npm run build` 13 routes; `npm run release:check`
publishable with the labeled draft privacy policy; `python scripts/check-discovery.py
--directory dist` 12 pages pass. Viewed in Chrome at 360, 390, 820, 1280 and 1440 px wide with
no console errors and no sideways scroll.

Publishing notes for whoever deploys: the frontend alone can be published the same way as the
November 10 discovery release (keep the live server module and bindings). The hero then shows
the season line. The outdoor temperature needs the worker from this branch, which is a
separate, larger release because the live server module predates the repository's worker.

Still needed from the owner: real photos, the license type, approval to show the reviews, and
whether "Insured" may be stated. The AI assistant's knowledge base must be re-provisioned when
this is published, or it will keep giving the old phone number and hours.

# Project state — 2026-10-09

## Cloudflare website consolidation candidate

Adam chose the existing private GitHub repository for the CSS website and a
Cloudflare path. Branch `agent/css-cloudflare-site` imports the owner-private
ChatGPT Site version 8 static source, commit
`f4e4b154f792a7a8da2f09a82ab893356267eece`, under `cloudflare/`.
It adds Wrangler static-assets/API routing with capture disabled, no public
Cloudflare route or version URL, and no tenant secret. The current ChatGPT Site
project ID and owner-private audience are unchanged.

The imported Node tests passed 20/20 on Windows after a CRLF-safe test fix.
Wrangler 4.149.0 dry-run passed; local Wrangler returned the page/assets and
`{"enabled":false}` at `/api/capture-status`, while `/api/lead` returned 503.
All eight static files matched the Site source by SHA-256. These checks do not
prove hosted delivery, office staffing, or customer acceptance.

The October 9 owner interview at `C:\Forge\CSS_OWNER_INTAKE_2026-10-09.md`
supersedes some older planning assumptions. It records "seven to five" hours,
while the current Site says 9am–5pm. Name spelling, exact coverage, contact
policy and publication claims need reconciliation. The older Node/SQLite
adapter draft PRs remain separate and cannot be deployed as-is on Workers.

## Historical scaffold — 2026-09-29

Initial private GitHub repository scaffold. Built locally from the discovery brief. Home and interior routes render; the booking and emergency forms validate requests and forward them only when an approved HTTPS GrowthOS webhook and token are configured. The integration has not been tested against a live receiver. No domain, business phone, customer asset, or production deployment is configured. Search indexing remains disabled.

Verified locally: `npm run lint`, `npm run build`, and browser checks on desktop and mobile pass. The request API returns `400` for invalid input, `403` for cross-origin input, and `503` when delivery is unconfigured. See `NEXT_ACTIONS.md` for launch dependencies.
