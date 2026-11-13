# Deploy brief: scroll-driven "system assembly" section for the csshvac.com homepage

For the Codex agent. Written by Claude on 2026-11-13 after Adam asked for a video that plays
as the visitor scrolls and supplied the clip.

**Second attempt.** The first attempt (source `ac93195`) was published and rolled back the
same day: the production phone check found the first caption hidden behind the docked Call
and Book bar until the second caption took over
(`docs/RELEASE_SCROLL_ASSEMBLY_2026-11-13.md`). This brief now points at the corrected
source. The correction changes three files under `site/` (caption timing in the one-column
layout, and a test for it); the 171 picture files are unchanged.

This brief asks for one thing: publish the new **frontend** from branch
`claude/css-scroll-assembly-20261113` to the live Worker, the same way the November 11
service-area release was published. The server module, bindings, secrets and domains stay
exactly as they are.

**Two approvals are needed before step 5, both from Adam in your session. This file is
neither.**

1. That this clip ships. The clip is an illustration that is not accurate to a real unit
   (parts stay outside the closed cabinet and the lettering on the fan is not real writing);
   `DECISIONS.md`, 2026-11-13, has the detail. Adam was told this and answered, in the Claude
   chat on 2026-11-13: "I'm just ready to check it out live first and then if I need it fixed
   I'll ask you. I just want codex to publish it now".
2. The usual go-ahead to deploy. The same sentence was accepted for the first attempt. Adam
   has not written anything further since the rollback; whether it covers this corrected
   retry is Codex's call under Forge's rules.

## What is being published

| Item | Value |
|---|---|
| Repository | `diazdestination/climate-simulation-solutions-smart-site` |
| Branch | `claude/css-scroll-assembly-20261113` (base `claude/css-service-areas-20261111`) |
| Frontend source commit | `c21b65c069bf6873e9b5ca00640d2a95d8b87eae` |
| Worker | `climate-simulation-solutions-site` (serves `csshvac.com` and `www.csshvac.com`) |
| Live version before this release | `f7ec6109-c8dd-47d0-92c8-231db5d81286` (restored by the rollback, per `docs/RELEASE_SCROLL_ASSEMBLY_2026-11-13.md`; confirm, do not assume) |
| Server module that must stay | SHA-256 `15f4e6843a6d247ca0fa8036679ecb088f5383921ae3fdbd978314e3898ec5ef` |

Later commits on the branch that only touch `docs/` (this brief included) do not change the
built assets. If the branch head has moved past the commit above, list the changed paths
(`git diff --stat c21b65c..HEAD`) and stop if anything outside `docs/` or the root `*.md` files
changed, unless Adam tells you to include it.

What visitors will see change, on the homepage only:

- A new section between the services list ("One team for the system behind your space.") and
  "Good service starts before anyone turns a wrench." Its heading is "A lot has to work
  together before the air feels right."
- Scrolling into it, the section holds still on screen while a heating and cooling unit comes
  together out of its parts, one frame per step of scrolling. Scrolling back up runs it
  backwards. Three captions take turns: "The parts that move heat", "The lines between them",
  "One cabinet outside". The last has a "See maintenance plans" link.
- Under the picture: "An illustration, not a diagram of your equipment."
- Visitors with reduced motion or data saver switched on see one still picture and all three
  captions, and nothing pins.

No other page changes. No stated fact, route, form field, request payload, structured data,
sitemap entry or assistant setting changes.

What changes in the build:

- `dist` grows from 55 files to 226. The 171 new files are pictures under
  `dist/assets/assembly/`: `full/000.webp` to `full/084.webp`, `phone/000.webp` to
  `phone/084.webp`, and `poster.webp`. They total about 5.7 MB; the largest is 55 kB.
- The frames are committed in `site/public/assets/assembly/`. The build only copies them, so
  Python and ffmpeg are **not** needed to build or deploy. (`site/scripts/make-scroll-frames.py`
  and `site/media/system-assembly.mp4` are how they were made; the clip is not published.)

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
git fetch origin claude/css-scroll-assembly-20261113
git checkout --detach c21b65c069bf6873e9b5ca00640d2a95d8b87eae
npm ci
$env:SITE_PUBLIC_ORIGIN = "https://csshvac.com"   # PowerShell; in cmd use: set SITE_PUBLIC_ORIGIN=https://csshvac.com
npm run build
npm test
npm run release:check
python scripts/check-discovery.py --directory dist
```

Expected results:

- Build: "Built 25 prerendered routes + /privacy/."
- Tests: 82 tests, 0 fail. On Linux one test is skipped (81 pass); on Windows the last release
  ran with none skipped. The six tests for this section are in
  `tests/scroll-assembly.test.mjs`; "one-column layout: every caption is current for a
  readable stretch after the section has pinned" is the one added after the rollback.
- Release gate: publishable with the labeled draft privacy policy (unchanged).
- Discovery check: 24 pages pass (unchanged).

On Linux this commit produced `assets/index-DPOMZVtT.js`, `assets/index-BiLgr7UT.css` and
`assets/VoiceDesk-BwP70pAE.js` (the stylesheet is unchanged from the first attempt). Different names on Windows are not a failure on their own, but
note them in your report.

### 3. Check the build before it goes anywhere

- `dist/assets/assembly/full` and `dist/assets/assembly/phone` each hold 85 `.webp` files, and
  `dist/assets/assembly/poster.webp` exists. `dist` holds 226 files in all.
- No file in `dist` is larger than 1 MB except those that already were (the limit that matters
  is Cloudflare's 25 MiB per file; nothing is near it).
- `dist/index.html` contains `id="assembly-title"` once and `assets/assembly/poster.webp`
  once, and does **not** contain `assets/assembly/full/` or `assets/assembly/phone/` (frames
  are fetched by script, later, and never by the page's HTML).
- No `.mp4` file anywhere in `dist`: `dir /s /b dist\*.mp4` lists nothing.
- `dist/google3740440f380836cd.html` and `dist/f85d4f255bc7b2215fe2b77722ec77b7.txt` exist.
- Open `dist/` through a local static server and scroll the homepage from top to bottom at a
  desktop width and at a phone width: the unit assembles while the section is held, the page
  carries on to "Good service starts…" afterwards, and there are no console errors.

### 4. Stage a new version: frontend assets only

Same method as the November 10 and 11 releases:

- New static assets from `site/dist`.
- The server module exactly as downloaded in step 1. Do not rebuild it from Git.
- `keep_bindings` metadata so variables, secrets and Secrets Store references carry over.
- Upload as a new **version** with no traffic.

Validate the staged version: server module hash unchanged, the same bindings by name, the same
schedules and compatibility settings, `/api/*` still routed to the worker first. Put this
release's evidence in a new folder, `C:\Forge\artifacts\css-scroll-assembly-20261113`.

### 5. Deploy (needs both approvals listed at the top)

Send 100% of traffic to the staged version. Record the new deployment ID and time.

### 6. Verify production

- `python scripts/check-discovery.py` against production: all 24 pages pass.
- `https://csshvac.com/assets/assembly/poster.webp`, `/assets/assembly/full/000.webp`,
  `/assets/assembly/full/084.webp`, `/assets/assembly/phone/000.webp` and
  `/assets/assembly/phone/084.webp` each return 200 with `content-type: image/webp`.
  `/assets/assembly/full/085.webp` does not return a picture.
- Homepage at desktop width: the section sits after the services list. Scrolling through it,
  the picture changes with the scroll and has no white box around it (the equipment sits
  directly on the pale background). The caption with the dark bar beside it moves down the
  list as you go. The mouse wheel is never held: keep scrolling and the page reaches "Good
  service starts before anyone turns a wrench."
- Homepage at phone width with touch (device emulation is fine; use 390 by 844, the size that
  failed, and one short screen such as 375 by 548): once the picture has stopped rising and
  is held on screen, the caption under it reads "The parts that move heat", fully above the
  Call and Book service bar. Keep scrolling: it changes to "The lines between them" and then
  "One cabinet outside", each one readable above the bar for a few swipes before the next.
  Scrolling back up shows them in reverse. Swiping up and down moves the page at all times.
  Measured locally in Chrome: each caption stays readable for 250 to 450 px of scrolling at
  those two sizes.
- Homepage at desktop width: the dark bar is beside "The parts that move heat" when the
  section first holds still, then moves to the second and third captions.
- On a real iPhone (ask Adam): the same swipe through the section. This is the one check that
  was not possible before release; it was tested in Chrome only.
- In the browser's network panel, loading the homepage and not scrolling requests **no** file
  under `/assets/assembly/full/` or `/assets/assembly/phone/`.
- With "reduce motion" switched on in the operating system (or emulated in dev tools), the
  section shows one still picture and all three captions, and nothing pins.
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
in step 1 (expected `f7ec6109-c8dd-47d0-92c8-231db5d81286`). That restores the previous
homepage in one step. Nothing else was changed, so nothing else needs undoing.
