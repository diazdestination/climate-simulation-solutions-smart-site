# Deploy brief: reviews section that reveals itself by scrolling (csshvac.com homepage)

For the Codex agent. Written by Claude on 2026-11-13 after Adam sent a clip of the reviews
section and asked for it to replace the Google review section, played by scrolling.

This brief asks for one thing: publish the new **frontend** from branch
`claude/css-reviews-scroll-20261113` to the live Worker, the same way the corrected
scroll-assembly release was published earlier the same day. The server module, bindings,
secrets and domains stay exactly as they are.

Adam's go-ahead for this release is required before step 5. This file is not that approval.
As of this brief he has asked for the section and has not yet seen it built.

## What is being published

| Item | Value |
|---|---|
| Repository | `diazdestination/climate-simulation-solutions-smart-site` |
| Branch | `claude/css-reviews-scroll-20261113` (base `claude/css-scroll-assembly-20261113` at `4ed4b09`) |
| Frontend source commit | `57d756c46f0b596ca18045f0e384a9f389dc6aa5` |
| Worker | `climate-simulation-solutions-site` (serves `csshvac.com` and `www.csshvac.com`) |
| Live version before this release | `00cde59b-827b-4c9c-85b6-773d84d4eaf5`, deployment `5af0c426-f5d8-4832-8f9e-c9c8be05242c` (per `docs/RELEASE_SCROLL_ASSEMBLY_RETRY_2026-11-13.md`; confirm, do not assume) |
| Server module that must stay | SHA-256 `15f4e6843a6d247ca0fa8036679ecb088f5383921ae3fdbd978314e3898ec5ef` |

Compared with the live source `c21b65c`, the frontend change is five files under `site/`:
`src/components/ReviewsScroll.jsx` (new), `src/lib/reviewScroll.js` (new),
`tests/reviews-scroll.test.mjs` (new), `src/pages/HomePage.jsx` and `src/home.css`. Confirm
with `git diff --stat c21b65c 57d756c -- site`. No picture or other static file is added or
removed: `dist` stays at 226 files.

Later commits on the branch that only touch `docs/` (this brief included) or the root `*.md`
files do not change the built assets. If the branch head has moved past the commit above,
list the changed paths (`git diff --stat 57d756c..HEAD`) and stop if anything else changed,
unless Adam tells you to include it.

What visitors will see change, on the homepage only, in the section headed "What customers
wrote on Google." (between the hero's season line and the services list):

- The word "Google." in the heading is amber, and the section has a faint warm glow at the
  top left and a cool one at the right.
- Scrolling into it, the section holds still on screen. The heading lifts away, the first
  review ("The hottest day we've had this year…") appears with its words dim, and the words
  light up in order as the visitor scrolls, followed by "Blake Turner, Google review".
  Scrolling back up runs it backwards.
- The section then lets go and the other four reviews rise into place one by one directly
  under the first, in two columns on a desktop and one on a phone, followed by the "Read
  every review on Google or write your own" line.
- Visitors with reduced motion switched on see the whole section at once as plain text.

Not changed: the wording of any review, the attribution lines, the two Google links, the
license and location line, the structured data, the sitemap, any other page, any form or
request payload, the assistant. No star ratings are shown, by decision (`DECISIONS.md`,
2026-11-13).

## Out of scope: do not do these

- Do not deploy `site/wrangler.jsonc` as it stands, and do not replace or rebuild the server
  module. `/api/outdoor` stays undeployed and keeps returning 404.
- Do not merge any pull request, and do not change `main`.
- Do not send test leads or anything that writes to GrowthOS, the outbox database or Resend.
- Do not change DNS, routes, WAF, secrets or bindings.
- Do not change the assistant, and do not resubmit anything to search engines: no URL is new.

## Steps

### 1. Confirm identity and current state (read-only)

- Sign in to Cloudflare and confirm the active identity and account against the account map.
- Read the Worker's current deployment. Record the live version ID, binding names (never
  values), schedules and domains.
- Download the live server module and compute its SHA-256. It should equal the value in the
  table. If it does not, stop and tell Adam.
- The version you record here is the rollback target for this release.

### 2. Build the frontend

Run in `site/`:

```
git fetch origin claude/css-reviews-scroll-20261113
git checkout --detach 57d756c46f0b596ca18045f0e384a9f389dc6aa5
npm ci
$env:SITE_PUBLIC_ORIGIN = "https://csshvac.com"   # PowerShell; in cmd use: set SITE_PUBLIC_ORIGIN=https://csshvac.com
npm run build
npm test
npm run release:check
python scripts/check-discovery.py --directory dist
```

Expected results:

- Build: "Built 25 prerendered routes + /privacy/."
- Tests: 88 tests, 0 fail. On Linux one test is skipped (87 pass); on Windows the last release
  ran with none skipped. The six new tests are in `tests/reviews-scroll.test.mjs`.
- Release gate: publishable with the labeled draft privacy policy (unchanged).
- Discovery check: 24 pages pass (unchanged).

On Linux this commit produced `assets/index-BkfOMtQ1.js`, `assets/index-D6Mykxj-.css` and
`assets/VoiceDesk-CzWbh7oJ.js`. Different names on Windows are not a failure on their own, but
note them in your report.

### 3. Check the build before it goes anywhere

- `dist` holds 226 files, as the live release does. `dist/assets/assembly/` is unchanged.
- `dist/index.html` contains `<section class="reviews" aria-labelledby="reviews-title">` once,
  and inside it the first review as one plain sentence:
  `<blockquote>The hottest day we’ve had this year and our ac decided to quit working.`
  It contains "License no. 23196912" twice (this section and the footer) and none of
  "out of 5", "stars" or "★".
- `dist/google3740440f380836cd.html` and `dist/f85d4f255bc7b2215fe2b77722ec77b7.txt` exist.
- Open `dist/` through a local static server and run the phone and desktop checks from step 6
  on the local build first, so that a failure costs no production switch.

### 4. Stage a new version: frontend assets only

Same method as the earlier releases:

- New static assets from `site/dist`.
- The server module exactly as downloaded in step 1. Do not rebuild it from Git.
- `keep_bindings` metadata so variables, secrets and Secrets Store references carry over.
- Upload as a new **version** with no traffic.

Validate the staged version: server module hash unchanged, the same bindings by name, the same
schedules and compatibility settings, `/api/*` still routed to the worker first. Repeat the
step 6 phone check against the zero-traffic candidate if your method allows. Put this
release's evidence in a new folder, `C:\Forge\artifacts\css-reviews-scroll-20261113`, with a
running `STATUS.md`.

### 5. Deploy (needs Adam's go-ahead for this release)

Send 100% of traffic to the staged version. Record the new deployment ID and time.

### 6. Verify production

- `python scripts/check-discovery.py` against production: all 24 pages pass.
- Homepage at phone width with touch (device emulation is fine; use 390 by 844 and one short
  screen such as 375 by 548), scrolling down from the top in small steps:
  - When the reviews section first holds still, the heading "What customers wrote on
    Google." and the license and location line are readable, above the Call and Book bar.
  - A little further, the heading is gone and the first review is on screen with most of its
    words dim. It is never cut off by the top of the screen or by the Call and Book bar.
  - Further, the words light up in reading order until the whole review is bright, then
    "Blake Turner, Google review" appears. That finished state stays for a few swipes.
  - Then the page moves on and the review by Joseph Messina rises in directly below, then the
    other three, then the "Read every review on Google" line. No review overlaps another.
  - Scrolling back up runs all of it in reverse. Swiping moves the page at all times.
  - Measured locally in Chrome at those two sizes: heading readable for 120 to 180 px of
    scrolling after the section pins, the review readable for 700 px or more, the finished
    review held for 120 px or more, the list never closer than 48 px to the first review.
- Homepage at desktop width (1440 by 900): the same sequence, with the first review set large
  across the page and the other four in two columns. The mouse wheel is never held: keep
  scrolling and the page reaches "One team for the system behind your space."
- With "reduce motion" switched on (or emulated), the section shows the heading, all five
  reviews and the links at once, and nothing pins.
- The scroll-assembly section further down the page still works as released: three captions
  in turn on a phone, each above the bar.
- The hero thermostat, the docked phone bar, (706) 502-0877 and the AI assistant behave as
  before.
- `GET /api/lead` still returns `ready:true`. Do not POST.
- `GET /api/elevenlabs/status` still returns `ready:true` with text on and voice off.
- Server module hash, binding names, schedules and domains are identical to step 1.

### 7. Record the release

Add a short release record beside this brief (source commit, new version and deployment IDs,
rollback version, what was checked, what was not done) as a commit on this branch.

## Rollback

If anything in step 6 fails, or Adam asks: send 100% of traffic back to the version recorded
in step 1 (expected `00cde59b-827b-4c9c-85b6-773d84d4eaf5`). That restores the homepage with
the static reviews section and the scroll-assembly section in one step. Nothing else was
changed, so nothing else needs undoing.
