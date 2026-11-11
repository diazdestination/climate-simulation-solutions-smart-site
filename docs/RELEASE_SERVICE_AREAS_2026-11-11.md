# CSS service-area frontend release — November 11, 2026

Published at https://csshvac.com/ and https://www.csshvac.com/ from frontend source
`2f657173877f3bc129edd1f0e6a7047aecdbbc12`, following
[the deployment brief](DEPLOY_BRIEF_SERVICE_AREAS_2026-11-11.md). Adam requested this
frontend-only deployment in the Codex session. Assistant changes and search submissions
were excluded.

## Production receipt

| Item | Verified value |
|---|---|
| Worker/account | `climate-simulation-solutions-site` / `4d9480db003a5c1e601c5dfac0d66505` |
| Source branch | `claude/css-service-areas-20261111`; [draft PR #11](https://github.com/diazdestination/climate-simulation-solutions-smart-site/pull/11), unmerged |
| Branch head reviewed before recording | `74f691305b5d5a7fb81631b4af1703c4d3c7b3ba`; only the deployment brief differs from the frontend source |
| Active version | `f7ec6109-c8dd-47d0-92c8-231db5d81286`, 100% traffic |
| Final deployment | `9f321e09-dfb8-4183-8768-acd6bf82161d` |
| Deployment time | November 11, 2026, 19:07:57 UTC / 11:07:57 a.m. Pacific |
| Rollback version | `33de63cb-72ed-466e-b39a-a375fca81f2c` |
| Unchanged live server SHA-256 | `15f4e6843a6d247ca0fa8036679ecb088f5383921ae3fdbd978314e3898ec5ef` |

The release uploaded the freshly downloaded live server without bundling or rebuilding
it from Git, alongside the new static assets. All 18 binding fingerprints, Secrets Store
references, compatibility/runtime settings, API-first routing, schedules, and domains match
the pre-release snapshot. The Git worker and its outdoor endpoint were not published.
Main remains `b5867bb4d437b9f9caab4c09cf8f675d5dc3a8f3`; no PR was merged.

## Validation

- Windows build: 25 prerendered routes plus privacy; 76 tests passed, zero failed/skipped.
  Release gate passed with the existing labeled draft privacy policy, still pending attorney review.
- Local and production discovery checks: all 24 public pages passed; robots, sitemap and
  llms files passed GET/HEAD checks; assistant and privacy remain noindex.
- All 55 production files match the exact local build by SHA-256 using normal requests.
  This includes all thirteen town pages and both search verification files. Twelve added towns
  are named in llms.txt; the sitemap has 24 URLs; old "call to check" wording is absent.
- Build filenames match the brief's Linux build:
  `index-BpiJTBa_.js`, `index-B9aGfWPK.css`, `VoiceDesk-DXRj1Fk7.js`.
  The stylesheet has `--r-control` and lacks the old button gradient.

| Brief step 6 check | Production result |
|---|---|
| Service-area directory | "Communities we serve." and thirteen rows |
| Twelve new URLs | HTTP 200; exact built town-specific content |
| Cumming map | Correct heading and highlighted town |
| Atlanta and Dahlonega, desktop/phone | Correct headings, 49/11-mile wording, no horizontal overflow at 1440/390 px |
| Homepage | Thermostat hero and (706) 502-0877 retained |
| Phone homepage | Fixed solid Call/Book bar, hidden duplicate hero actions, three triage tiles and four planning rows; No heat opens urgent; Tune-up selects Maintenance |
| Phone urgent page | Single amber Call bar; five readable locked keys; two No answers unlock keys and form; either Yes displays red safety stop |
| Phone booking | Call-only bar; preferred-time choice gains ring/check and clears on second tap; no submission |
| Plans | Two cards show 2 and 4 visits a year |
| Desktop controls | Hero Book/Call side by side; both drop 2 px when held; assistant opens and closes without starting a session |
| Thermostat touch | Chrome touch emulation: vertical ring swipe scrolled 153 px, target stayed 70; tap changed target; sideways drag changed target |
| Browser errors | Zero unexpected console/JavaScript errors; expected undeployed outdoor API 404 fallback remains |
| Lead readiness | GET 200, ready:true, email_ready; no POST |
| Assistant readiness | GET 200, ready:true, localOnly:false, text:true, voice:false |
| Server/config preservation | Downloaded final server hash and all binding fingerprints, schedules, domains and runtime/settings match baseline |

A physical phone was not tested. Browser requests included existing Cloudflare RUM beacons;
no service form, lead, GrowthOS/outbox request, Resend email or assistant session was sent.

## Initial rollback and retry

Initial deployment `0fd99ad7-ef00-4225-a902-8963950b5dd2` encountered an initial stylesheet 404
and a failed Johns Creek discovery request. In accordance with the brief, production was
returned to the rollback version via deployment `5886ccd9-4bc5-4466-a581-8723563732ea`.
The unchanged candidate was then placed at 0% and checked using Cloudflare's documented
version override: all 55 files matched and functional checks passed. That browser override
also caused test-header CORS errors on Cloudflare's external beacon, which were absent after
removing the header. No source/config repair was required. Initial failures appear consistent
with rollout propagation; the underlying provider cause was not proven. The final deployment
passed all normal-request HTTP, discovery and browser checks above.

## Held follow-ups and recovery

Brief steps 7 and 8 were not performed: the existing assistant still asks callers to confirm
service-area availability, while the website lists the towns as served. Updating that agent,
Search Console sitemap submission and IndexNow require their separate approval.

To roll back, deploy `33de63cb-72ed-466e-b39a-a375fca81f2c@100%` to the same Worker.
That restores the prior pages; the twelve new town pages then return not found. No assistant
rollback is needed because its configuration was not changed.

Nonsecret snapshots, logs, hash manifests, screenshots and browser results:
`C:\Forge\artifacts\css-service-areas-20261111`.
