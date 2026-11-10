# CSS living homepage release - November 10, 2026

The reviewed frontend is published at https://csshvac.com/ and https://www.csshvac.com/.
Adam approved publication as-is in the Codex session after the staged preview and the open
reviews/license/weekend-hours/phone decisions were shown. The license type and independent
owner approval of the reviews were not established by this release.

## Exact source and deployment

- Frontend source: `75eef1993fb4fa70328ba6e9ca3a53264ff5ce41` from
  `claude/css-living-hero-20261110`, draft PR #9.
- Pre-release branch head: `61a4baf88ff8bdb5b460d5abab95d86221991034`; its delta from the
  frontend source is only the deployment brief. This release-record commit changes docs only.
- Production Worker: `climate-simulation-solutions-site`, account
  `4d9480db003a5c1e601c5dfac0d66505`; active identity `diazdestination@gmail.com` verified.
- Production version: `141d00a9-2373-4b0c-9cdb-80a242f0eca8`, 100% traffic.
- Deployment: `e86db58b-226e-4309-9c2c-9c71d9cdcd66` at `2026-11-10T19:43:46.20738Z`.
- Rollback version: `441f7e88-ff6c-4866-9d1c-1ec2377638da`.
- Server module retained byte-for-byte, without rebuilding from Git. SHA-256:
  `16a4a615dde5f3762843bb41bcddb3645988a607c7af18fd81c69f75a30e267b`.

This publishes page/assets changes only. The Git worker and its new outdoor endpoint are not
part of the release. All 16 binding fingerprints, compatibility settings, API asset routing,
schedules, subdomain settings and both domain mappings match the fresh pre-release snapshot.
Secret values were not written into the evidence or output. The documented keep_bindings API
metadata retained plain variables, encrypted secrets and Secrets Store references.

## Checks completed

| Check | Result |
| --- | --- |
| Build | 13 prerendered routes plus existing noindex privacy page; asset names match brief |
| Tests | 57 passed, 0 skipped, 0 failed (brief expected 56 plus 1 skipped) |
| Release gate | Publishable with the unchanged, labeled draft privacy policy; attorney review remains pending |
| Discovery | All 12 canonical public pages pass against production; robots/sitemap/llms GET and HEAD 200; assistant/privacy remain noindex |
| Homepage desktop and mobile | Correct heading, thermostat and new phone; season fallback; fixed mobile Call + Book service bar; no sideways overflow or console errors |
| Contact facts | Published phone (706) 502-0877; weekday 9-5 and weekend 8-6 hours; old phone absent from built files |
| GET /api/lead | HTTP200, ready:true, code:email_ready; customer confirmations off |
| GET /api/outdoor | Expected HTTP404 with code:not_found; hero displays Heating season in North Georgia |
| Google ownership file | Exact original content readable through the existing same-origin extension-removal redirect |
| Server and provider configuration | Original module hash and binding/runtime/schedule/domain comparisons pass |
| Book service | HTTP200; 23 form fields present; no console errors |
| Urgent | HTTP200; safety fields present; no console errors |
| Maintenance plans | HTTP200; 22 form fields present; no console errors |
| HVAC maintenance service page | HTTP200; content loads; no console errors; this content page does not contain an intake form |

No required step6 check failed and no rollback was needed. No test leads were submitted.

## Assistant refresh: prepared, NOT applied

Step7 dry-run completed locally, with no network calls. Generated prompt/knowledge documents
contain (706) 502-0877 and Monday-Friday 9 a.m.-5 p.m.; Saturday-Sunday 8 a.m.-6 p.m.
Neither 809-5076 nor 8095076 occurs in the generated payload.

Real assistant provisioning is awaiting Adam's separate approval. The existing agent and
account must be identified before applying; do not allow a new agent to be created by a
failed name/ID match. The website assistant's old facts described in the deployment brief
have not been refreshed by this frontend release. No ElevenLabs conversation was started.

## Scope and recovery

PR #9 and PR #8 remain unmerged; main is unchanged. No DNS, routes, WAF, provider-secret
values, GrowthOS, outbox records, Resend messages, IndexNow or sitemap submissions changed.
Execution was on WILLOWFORGE (the brief addresses GEEKOM); account/target checks were fresh.

If a required production check later fails during this release, or Adam requests rollback,
send 100% traffic to version `441f7e88-ff6c-4866-9d1c-1ec2377638da` using Wrangler versions
deploy and the preserved overlay. No assistant rollback is required for this release because
it was not re-provisioned. Do not deploy the repository's bare site/wrangler.jsonc.

Evidence: `C:/Forge/artifacts/css-living-hero-20261110/` on WILLOWFORGE, including
owner-approval-step5.json, deployment.log, production-preservation.json,
production-http-checks.json, discovery-production.json, production-browser-routes.json,
production-browser-home.json, live-home-desktop.png, live-home-mobile.png,
assistant-dry-run.json, release-completion.json and rollback-after-failed-release.ps1.
