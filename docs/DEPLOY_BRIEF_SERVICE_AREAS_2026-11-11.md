# Deploy brief: service-area pages and thermostat scroll fix for csshvac.com

For the Codex agent. Written by Claude on 2026-11-11 at Adam's request.

This brief asks for one thing: publish the new **frontend** from branch
`claude/css-service-areas-20261111` to the live Worker, the same way the November 10 homepage
release was published. The server module, bindings, secrets and domains stay exactly as they
are. Step 7 (the assistant) and step 8 (search engines) each need their own go-ahead.

Adam's go-ahead in your session is required before step 5. This file is not that approval.

## What is being published

| Item | Value |
|---|---|
| Repository | `diazdestination/climate-simulation-solutions-smart-site` |
| Branch | `claude/css-service-areas-20261111` (draft PR, base `codex/css-text-assistant-activation-20261110`) |
| Frontend source commit | `df3b7a5411a96049c856d800ba966afd9e49724d` |
| Worker | `climate-simulation-solutions-site` (serves `csshvac.com` and `www.csshvac.com`) |
| Live version before this release | `33de63cb-72ed-466e-b39a-a375fca81f2c` (per `docs/RELEASE_TEXT_ASSISTANT_2026-11-10.md`; confirm, do not assume) |
| Server module that must stay | SHA-256 `15f4e6843a6d247ca0fa8036679ecb088f5383921ae3fdbd978314e3898ec5ef` |

Later commits on the branch that only touch `docs/` (this brief included) do not change the
built assets. If the branch head has moved past the commit above, list the changed paths
(`git diff --stat df3b7a5..HEAD`) and stop if anything outside `docs/` or the root `*.md` files
changed, unless Adam tells you to include it.

What visitors will see change:

- `/service-areas/` reads "Communities we serve" with a map and a directory of thirteen towns.
  The "Communities you can call to check" wording is gone.
- Twelve new pages, one per town: `/service-areas/dahlonega-ga/`, `cumming-ga`,
  `gainesville-ga`, `jasper-ga`, `ball-ground-ga`, `canton-ga`, `buford-ga`, `alpharetta-ga`,
  `cleveland-ga`, `roswell-ga`, `johns-creek-ga`, `atlanta-ga`. The Dawsonville page moves to
  the same layout.
- Homepage service-area section: new heading, a larger map (rings at 10, 25 and 50 miles) and
  links to every town page. The "Do you serve my area?" answer lists the towns.
- Homepage thermostat on phones: a thumb that lands on the dial now scrolls the page. Before,
  the dial swallowed the swipe (Adam reported the page "freezes on the down scroll"). A tap or
  a sideways drag still sets the temperature. The air animation also starts without the short
  freeze it caused on load.

`DECISIONS.md` (2026-11-11) has the reasons and what the pages deliberately do not claim.

## Out of scope: do not do these

- Do not deploy `site/wrangler.jsonc` as it stands, and do not replace or rebuild the server
  module. `/api/outdoor` stays undeployed and keeps returning 404.
- Do not merge any pull request, and do not change `main`.
- Do not send test leads or anything that writes to GrowthOS, the outbox database or Resend.
- Do not change DNS, routes, WAF, secrets or bindings.

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
git fetch origin claude/css-service-areas-20261111
git checkout --detach df3b7a5411a96049c856d800ba966afd9e49724d
npm ci
$env:SITE_PUBLIC_ORIGIN = "https://csshvac.com"   # PowerShell; in cmd use: set SITE_PUBLIC_ORIGIN=https://csshvac.com
npm run build
npm test
npm run release:check
python scripts/check-discovery.py --directory dist
```

Expected results:

- Build: "Built 25 prerendered routes + /privacy/."
- Tests: 67 tests, 0 fail. On Linux one test is skipped (66 pass); on Windows the last release
  ran with none skipped.
- Release gate: publishable with the labeled draft privacy policy (unchanged).
- Discovery check: 24 pages pass. The script on this branch expects 24; the older copy
  expects 12 and will fail against this build.

On Linux this commit produced `assets/index-DxcOh89q.js`, `assets/index-SFP_x1GZ.css` and
`assets/VoiceDesk-CtqIEAly.js`. Different names on Windows are not a failure on their own, but
note them in your report.

### 3. Check the build before it goes anywhere

- `dist/service-areas/` holds `index.html` and thirteen town folders.
- `dist/sitemap.xml` lists 24 URLs; `dist/llms.txt` names the twelve towns.
- `dist/google3740440f380836cd.html` and `dist/f85d4f255bc7b2215fe2b77722ec77b7.txt` exist.
- No built page contains "call to check": `findstr /s /m /c:"call to check" dist\*` lists no
  files.
- Open `dist/service-areas/cumming-ga/` through a local static server: the heading reads
  "Heating and cooling service in Cumming.", the map picks Cumming out in amber, and there are
  no console errors.

### 4. Stage a new version: frontend assets only

Same method as the November 10 releases:

- New static assets from `site/dist`.
- The server module exactly as downloaded in step 1. Do not rebuild it from Git.
- `keep_bindings` metadata so variables, secrets and Secrets Store references carry over.
- Upload as a new **version** with no traffic.

Validate the staged version: server module hash unchanged, the same bindings by name, the same
schedules and compatibility settings, `/api/*` still routed to the worker first. Put this
release's evidence in a new folder, `C:\Forge\artifacts\css-service-areas-20261111`.

### 5. Deploy (needs Adam's go-ahead in your session)

Send 100% of traffic to the staged version. Record the new deployment ID and time.

### 6. Verify production

- `python scripts/check-discovery.py` (this branch's copy) against production: all 24 pages
  pass; `robots.txt`, `sitemap.xml` and `llms.txt` return 200; assistant and privacy stay
  noindex.
- `https://csshvac.com/service-areas/` shows "Communities we serve." and thirteen rows.
- Each of the twelve new URLs returns 200 with the town in its heading. Spot-check
  `atlanta-ga` (about 49 miles) and `dahlonega-ga` (about 11 miles) in a browser at desktop
  and phone widths: no console errors, no sideways scroll.
- The homepage still shows the thermostat hero and (706) 502-0877.
- On a real phone (ask Adam, or use device emulation with touch): put a thumb on the
  thermostat's ring and swipe up. The page scrolls and the reading under "Heating to" does not
  change. Tap the ring: the set temperature changes. This is the fix Adam asked for, so it is
  the one check that needs a touch screen.
- `GET /api/lead` still returns `ready:true`. Do not POST.
- `GET /api/elevenlabs/status` still returns `ready:true` with text on and voice off.
- Server module hash, binding names, schedules and domains are identical to step 1.

### 7. Update the AI assistant's service-area wording (separate approval)

The live assistant still describes the service area as "surrounding North Georgia communities;
call with the service address to confirm availability". The site config on this branch names
the twelve towns.

- Run `npm run provision:dry-run` in `site/` and confirm the printed payload contains
  "the surrounding communities of Dahlonega, Cumming, Gainesville".
- With Adam's approval, apply it to the **existing** agent
  `agent_3301m73gbx5kfh1bp0h1nssgba8k`. Do not let a name mismatch create a second agent.
- If Adam does not approve this now, tell him the assistant will keep telling visitors to call
  to confirm availability while the website says those towns are served.

### 8. Tell search engines about the new pages (separate approval)

Twelve URLs are new, so this release is the one where a sitemap resubmission is useful. With
Adam's approval, resubmit `https://csshvac.com/sitemap.xml` in Search Console and send the
twelve new URLs through IndexNow. Skip this step if he has not approved it.

### 9. Record the release

Add a short release record beside this brief (source commit, new version and deployment IDs,
rollback version, what was checked, what was not done) as a commit on this branch.

## Rollback

If anything in step 6 fails, or Adam asks: send 100% of traffic back to the version recorded
in step 1 (expected `33de63cb-72ed-466e-b39a-a375fca81f2c`). That restores the previous pages
in one step. The twelve town URLs then return the site's not-found page again. If step 7 was
applied, the assistant needs its previous wording restored separately; say so.

## Report back to Adam

Published or not; new version and deployment IDs; rollback version; the result of each step 6
check; whether steps 7 and 8 were done; anything that did not match this brief.
