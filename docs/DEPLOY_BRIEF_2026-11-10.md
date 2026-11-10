# Deploy brief: living homepage for csshvac.com

For the Codex agent on GEEKOM. Written by Claude on 2026-11-10 at Adam's request.

This brief asks for one thing: publish the new **frontend** from pull request #9 to the live
Worker, the same way the November 10 discovery release was published. The server module,
bindings, secrets and domains stay exactly as they are.

Adam's go-ahead in your session is required before step 5. This file is not that approval.

## What is being published

| Item | Value |
|---|---|
| Repository | `diazdestination/climate-simulation-solutions-smart-site` |
| Branch | `claude/css-living-hero-20261110` (draft PR #9, base `codex/css-discovery-20261109`) |
| Frontend source commit | `3e19e3db02ce7a7f300bf7bd5dcbdbabe1ef76b4` |
| Worker | `climate-simulation-solutions-site` (serves `csshvac.com` and `www.csshvac.com`) |
| Live version before this release | `441f7e88-ff6c-4866-9d1c-1ec2377638da`, deployment `a3cecad8-3e9d-44a0-a6c5-e267d3b08cfd` (per `docs/CSS_DISCOVERY_2026-11-09.md`; confirm, do not assume) |
| Server module that must stay | SHA-256 `16a4a615dde5f3762843bb41bcddb3645988a607c7af18fd81c69f75a30e267b` |

Later commits on the branch that only touch `docs/` (this brief included) do not change the
built assets. If the branch head has moved past the commit above, list the changed paths
(`git diff --stat 3e19e3d..HEAD`) and stop if anything outside `docs/` or the root `*.md` files
changed, unless Adam tells you to include it.

What visitors will see change: the homepage (moving-air hero with a thermostat, symptom
buttons, five Google reviews, a real service-area map, the phone number as the closing
headline), the phone number **(706) 502-0877** everywhere, hours **Monday–Friday 9 a.m.–5 p.m.
and Saturday–Sunday 8 a.m.–6 p.m.**, "License no. 23196912", a Call + Book service bar on
phones, and a new display typeface on every page. `DECISIONS.md` (2026-11-10) has the full
list and the reasons.

## Out of scope: do not do these

- Do not deploy `site/wrangler.jsonc` as it stands. It omits the live Secrets Store references.
- Do not replace, rebundle or redeploy the server module. That means `/api/outdoor` (new in
  `site/worker/`) will **not** be live after this release, and that is expected: the page then
  shows "Heating season in North Georgia" where the outdoor temperature would be. Shipping the
  worker is a separate release that needs its own plan.
- Do not merge PR #9 or PR #8, and do not change `main`.
- Do not send test leads, customer messages or anything that writes to GrowthOS, the outbox
  database, Resend or ElevenLabs conversations.
- Do not resubmit IndexNow or the Google sitemap. The 12 public URLs are unchanged.
- Do not change DNS, routes, WAF, secrets or bindings.

## Ask Adam before you start

Publishing is his call. These are still open with the business owner, and he may want to wait
for some of them:

1. Has the owner approved showing the five Google reviews?
2. What kind of license is 23196912? The site prints the number without naming a board or
   class. (Georgia conditioned-air contractor numbers normally start with CN or CR.)
3. Weekend hours: the site will show "Office open now" on Saturdays and Sundays from 8 to 6.
4. Old number: (706) 809-5076 still appears on the old site and possibly on the Google and
   Facebook listings.

If Adam says publish anyway, record that he did and continue.

## Steps

### 1. Confirm identity and current state (read-only)

- Sign in to Cloudflare. Confirm the active identity and account match
  `C:\Forge\memory\ACCOUNT_MAP.md`. Stop if they do not.
- Read the Worker's current deployment. Record the live version ID, its traffic percentage,
  the binding count and names (16 expected, names only, never values), schedules, and the
  domains mapped to the Worker.
- Download the live server module through the authenticated API and compute its SHA-256.
  It should equal the value in the table above. If it does not, stop and tell Adam: someone
  has changed the server since November 10.
- The version you recorded here is the rollback target for this release.

### 2. Build the frontend

Run in `site/`:

```
git fetch origin claude/css-living-hero-20261110
git checkout --detach 3e19e3db02ce7a7f300bf7bd5dcbdbabe1ef76b4
npm ci
$env:SITE_PUBLIC_ORIGIN = "https://csshvac.com"   # PowerShell; in cmd use: set SITE_PUBLIC_ORIGIN=https://csshvac.com
npm run build
npm test
npm run release:check
python scripts/check-discovery.py --directory dist
```

Expected results:

- Build: "Built 13 prerendered routes + /privacy/."
- Tests: 57 tests, 56 pass, 1 skipped, 0 fail.
- Release gate: publishable with the labeled draft privacy policy (attorney review pending,
  unchanged from the last release).
- Discovery check: 12 pages pass; assistant and privacy stay noindex.

On Linux this commit produced `assets/index-3tdbkwRR.js`, `assets/index-CTFp3Wq0.css` and
`assets/VoiceDesk-lCM8NJVU.js`. Matching names on Windows are a good sign. Different names are
not a failure on their own (line endings can change hashes), but note them in your report.

`npm ci` installs one new package, `@fontsource-variable/archivo`, and no longer installs
`@fontsource/manrope`. Fonts are bundled into `dist/assets`; nothing is fetched from a font
service at runtime.

### 3. Check the build before it goes anywhere

Open `dist/index.html` through a local static server (or `npm run preview`) and confirm:

- The phone number reads (706) 502-0877 in the header, hero, closing section and footer, and
  809-5076 appears nowhere: `findstr /s /m "809-5076 8095076" dist\*` should list no files.
- `dist/google3740440f380836cd.html` and `dist/f85d4f255bc7b2215fe2b77722ec77b7.txt` exist.
  The first keeps Search Console ownership; the second is the IndexNow key.
- `dist/robots.txt`, `dist/sitemap.xml` (12 URLs) and `dist/llms.txt` exist.
- No console errors on the homepage. The hero's request to `/api/outdoor` may fail locally or
  return a temperature, depending on your network. Either is fine.

### 4. Stage a new version: frontend assets only

Use the same method as the November 10 release (evidence and overlay under
`C:\Forge\artifacts\css-discovery-20261109`):

- New static assets from `site/dist`.
- The server module exactly as downloaded in step 1. Do not rebuild it from Git.
- `keep_bindings` metadata so plain variables, encrypted secrets and Secrets Store references
  carry over without their values being read.
- Upload as a new **version** with no traffic. Do not deploy yet.

Validate the staged version: server module hash unchanged, the same 16 bindings by name, the
same schedules and compatibility settings, asset routing still sends `/api/*` to the worker
first. Save the staged version ID.

Put this release's evidence in a new folder, `C:\Forge\artifacts\css-living-hero-20261110`, and
leave the November 9 folder as it is.

### 5. Deploy (needs Adam's go-ahead in your session)

Send 100% of traffic to the staged version. Record the new deployment ID and time.

### 6. Verify production

Run each check and save the output:

- `python scripts/check-discovery.py` against production: all 12 canonical pages pass;
  `robots.txt`, `sitemap.xml` and `llms.txt` return 200; assistant and privacy stay noindex.
- `https://csshvac.com/` shows "Your Indoor Weather Experts", the thermostat, and
  (706) 502-0877. View it at phone width too: the Call and Book service bar is fixed at the
  bottom.
- `GET https://csshvac.com/api/lead` still returns `ready:true` with `code:email_ready`.
  Do not POST.
- `GET https://csshvac.com/api/outdoor` returns 404 `{"code":"not_found"}`. That is the
  expected answer from the unchanged server, and the hero shows the season line.
- `GET https://csshvac.com/google3740440f380836cd.html` still serves the verification file.
- Server module hash, binding names, schedules and domains are identical to step 1.
- `/book-service/`, `/urgent/`, `/maintenance-plans/` and one service page load without
  console errors, and the request form still shows its fields. Do not submit it.

### 7. Update the AI assistant's facts (separate approval)

The website assistant is an ElevenLabs agent whose system prompt and knowledge base were
provisioned from `site/site.config.mjs`. Until it is re-provisioned it will keep telling
visitors the old phone number and the old hours (Monday–Friday 7 to 5).

- Run `npm run provision:dry-run` in `site/`. It makes no network calls. Confirm the printed
  payload contains (706) 502-0877 and the new hours and contains no 809-5076.
- Show Adam the dry-run result. Only with his approval, run the real provisioning
  (`node core/agent/provision.mjs --config site.config.mjs --templates agent --apply`) with the
  existing agent ID and API key from the secret store. Never print the key.
- If Adam does not approve this now, tell him plainly that the assistant and the website
  disagree about the phone number and hours until it is done.

### 8. Record the release

Append a dated section to `docs/CSS_DISCOVERY_2026-11-09.md` or add a short new doc beside
this one, in the same style as the November 10 entry: source commit, new version and
deployment IDs, rollback version, what was checked, and what was not done. Open it as a
commit on this branch; do not push to `main`.

## Rollback

If anything in step 6 fails, or Adam asks: send 100% of traffic back to the version recorded
in step 1 (expected `441f7e88-ff6c-4866-9d1c-1ec2377638da`). That restores the previous
homepage, phone number and hours in one step. Then report what failed. If the assistant was
re-provisioned in step 7, it will need the old facts restored separately; say so.

## Report back to Adam

Keep it short: published or not; new version and deployment IDs; rollback version; the
result of each step 6 check; whether the assistant was re-provisioned; anything that did not
match this brief.
