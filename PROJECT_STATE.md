# Reviews-scroll candidate — 2026-11-13 (branch `claude/css-reviews-scroll-20261113`)

Built on `claude/css-scroll-assembly-20261113` at `4ed4b09` (the live frontend is its source
`c21b65c`, version `00cde59b`). Not merged and not deployed: csshvac.com still shows the
static reviews section. Source `57d756c46f0b596ca18045f0e384a9f389dc6aa5` replaces that
section with one that pins and reveals the lead review a word at a time as the visitor
scrolls (2026-11-13 entry in `DECISIONS.md`); Adam asked for it from a clip and has not yet
seen the built version. Verified locally in `site/`: 25 prerendered routes; `npm test` 87
passed, 1 skipped, 0 failed; release gate publishable with the labeled draft privacy policy;
24 discovery pages pass; `dist` still 226 files. Stepped through in Chrome at seven screen
sizes from 320 by 480 to 1920 by 1080. Publishing steps:
`docs/DEPLOY_BRIEF_REVIEWS_SCROLL_2026-11-13.md`.

# Scroll-assembly corrected retry live — 2026-11-13

Codex accepted Adam's corrected-retry publish instruction relayed by Claude, built exact
c21b65c, and published version 00cde59b-827b-4c9c-85b6-773d84d4eaf5 at 100%, deployment
5af0c426-f5d8-4832-8f9e-c9c8be05242c at 08:30:54 UTC. Confirmed rollback remains
f7ec6109-c8dd-47d0-92c8-231db5d81286. All 82 Windows tests, 24 production discovery pages,
226 production file hashes, exact live server and 18 bindings/runtime/settings/schedules/domains
pass. Chrome 390x844 and 375x548 locally, at 0% candidate, and direct production show all 3 captions
fully above docked bar, forward/reverse. Desktop/reduced-motion/lazy-load checks pass. Physical
iPhone, reliable touch-injection proof and exact CSS-pixel dwell remain unverified. No lead/chat/
search/provider write, main update or merge. Separate Claude standing ownership remains pending
Adam confirmation; no authority file changed. See docs/RELEASE_SCROLL_ASSEMBLY_RETRY_2026-11-13.md
and retry artifacts.

# Scroll-assembly corrected candidate — 2026-11-13 (historical pre-retry entry)

Claude fixed the phone caption fault that caused the rollback: source
`c21b65c069bf6873e9b5ca00640d2a95d8b87eae` on `claude/css-scroll-assembly-20261113`. Not
deployed: csshvac.com is on `f7ec6109`. Verified locally in `site/`: 25 prerendered routes;
`npm test` 81 passed, 1 skipped, 0 failed; release gate publishable with the labeled draft
privacy policy; discovery check passes. In Chrome at 375 by 548, 390 by 664, 390 by 844,
820 by 1180 and 1440 by 900, each of the three captions is readable above the docked bar for
250 px of scrolling or more while the section is held, with no console errors. The deploy
brief is updated for this source. Not checked on a physical phone.

# Scroll-assembly release attempted and rolled back — 2026-11-13

Codex accepted Adam's specific publish instruction relayed by Claude, reviewed the branch,
built exact ac93195 and staged/published frontend version ed03920d. All81Windows tests,
24production discovery pages and226production file hashes passed, but the390x844phone
check found the first caption obscured by the docked Call/Book bar until the next caption
took over. Rolled back at08:03:47UTC to f7ec6109-c8dd-47d0-92c8-231db5d81286 at100%,
deployment5f58dc1b-692d-4ac7-b9c5-9bdfc02170df. All55prior files, readiness endpoints,
24discovery pages, exact server and18bindings/settings/schedules/domains reverified.
No main/merge/provider/search changes. Physical iPhone remains open. Fix and review phone
caption timing/clearance before a newly authorized release. Ongoing Claude ownership remains
pending Adam confirmation. See docs/RELEASE_SCROLL_ASSEMBLY_2026-11-13.md and local artifacts.

# Scroll-assembly candidate — 2026-11-13 (historical pre-release entry)

Built on `claude/css-service-areas-20261111` (the source of the live frontend). Not merged and
not deployed: csshvac.com is unchanged. The homepage gains one section after the services
index, where a clip Adam supplied plays as the visitor scrolls (see the 2026-11-13 entry in
`DECISIONS.md`). Adam has not yet reviewed the built section, its wording or whether this clip
should ship: the clip is not an accurate picture of a real unit and the entry says why.
Verified locally in `site/`: 25 prerendered routes; `npm test` 80 passed, 1 skipped, 0 failed;
release gate publishable with the labeled draft privacy policy; `python
scripts/check-discovery.py --directory dist` 24 pages pass. `dist` grows from 55 files to 226
(171 picture files, 5.7 MB). Viewed in Chrome at 390, 820 and 1440 px with no console errors
or sideways scroll. Publishing steps: `docs/DEPLOY_BRIEF_SCROLL_ASSEMBLY_2026-11-13.md`.

# Verified live release and follow-up — 2026-11-11

The service-area pages, interface rebuild and thermostat scroll fix from `2f65717` are live.
The original server module, all 18 bindings, runtime, schedules and domains are preserved.
Production version `f7ec6109-c8dd-47d0-92c8-231db5d81286` serves 100%; the release record
contains deployment and rollback IDs and the 76-test, 24-page, 55-file and browser evidence.

Adam approved the assistant/search follow-up after publication. The existing assistant now
names Dawsonville and all twelve approved communities; provider readback and a public synthetic
text chat verified the wording. Other agent settings and tools are unchanged. IndexNow accepted
the twelve new town URLs with HTTP 200. Search Console sitemap resubmission is waiting for
owner reauthentication as `diazdestination@gmail.com`; indexing is not confirmed.

See [the current release record](docs/RELEASE_SERVICE_AREAS_2026-11-11.md).
PR #11 remains draft/unmerged, and main is unchanged. The candidate entries below are historical.

# Service-area candidate — 2026-11-11 (branch `claude/css-service-areas-20261111`)

Built on `codex/css-text-assistant-activation-20261110`. Not merged and not deployed: the live
site still shows "Communities you can call to check" and has one area page. This branch states
that the twelve listed communities are served and adds a page for each, fixes the homepage
thermostat trapping scroll on phones, and rebuilds the site's buttons, cards and forms as one
system (three 2026-11-11 entries in `DECISIONS.md`). Verified locally in `site/`: 25
prerendered routes; `npm test` 75 passed, 1 skipped, 0 failed; release gate publishable with
the labeled draft privacy policy; `python scripts/check-discovery.py --directory dist` 24
pages pass. Every page type was viewed in Chrome at 390, 820 and 1440 px with no console
errors or sideways scroll. Publishing steps: `docs/DEPLOY_BRIEF_SERVICE_AREAS_2026-11-11.md`.

# Current live state — 2026-11-10 (Codex follow-up)

The living frontend is published and CSS text chat is connected. A synthetic public browser
session returned the approved phone and weekday/weekend hours; voice remains disabled.
See `docs/RELEASE_TEXT_ASSISTANT_2026-11-10.md` for the active version, limits, and recovery.
The full Git worker, including the outdoor-temperature endpoint, is still not deployed. The
source branch is a reviewed follow-up candidate; do not deploy bare Wrangler configuration
without retaining the existing provider Secret Store bindings.

# Project state — 2026-11-10 (earlier Claude candidate)

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
