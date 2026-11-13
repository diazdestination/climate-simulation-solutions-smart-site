# Reviews scroll frontend release — 2026-11-13

Live at https://csshvac.com/. Exact frontend source:
`57d756c46f0b596ca18045f0e384a9f389dc6aa5`.

| Record | Value |
|---|---|
| Worker | `climate-simulation-solutions-site` |
| Version, 100% traffic | `4e18ca97-8602-4d6d-b6b2-a82c702452f2` |
| Production deployment | `6fb02d72-44e6-486c-b58f-01af491956f5` |
| Promotion time | `2026-11-13T09:58:30.240214Z` |
| Confirmed rollback version | `00cde59b-827b-4c9c-85b6-773d84d4eaf5` |
| Baseline deployment | `5af0c426-f5d8-4832-8f9e-c9c8be05242c` |
| Candidate at 0% deployment | `2fce3812-dcb1-487f-b82d-750aa20570e9` |
| Reviewed branch head | `441ed0365e2811bbe7a54b99173633b0a9f4bcb6` |
| Main, unchanged | `b5867bb4d437b9f9caab4c09cf8f675d5dc3a8f3` |

## Authorization and scope

Claude relayed Adam's words from a separate claude.ai chat that Codex cannot read.
At 04:23 Eastern on November 13 Adam sent a 12-second clip and asked:
"Could we do the same with this video to replace the Google review section?"
Claude reports explaining the live-text implementation, omitted stars/buttons/labels,
and providing a preview and phone recording. At 04:40 Eastern Adam replied:
"Make it live". Codex accepted that specific release instruction as relayed in this
request. The brief's earlier statement that Adam had not seen it is superseded by
this relay. No standing lead assignment, exclusive ownership or Claude push authority
was granted or changed.

Claude pushed the branch before Codex review. Codex fetched and reviewed the actual
change before building. The diff from `c21b65c` to `57d756c` is exactly five files
under `site/`: ReviewsScroll.jsx, reviewScroll.js, reviews-scroll.test.mjs,
HomePage.jsx and home.css. Static files, review wording, facts and Google links are
unchanged. The later diff to `441ed03` changes only DECISIONS.md, PROJECT_STATE.md
and the deploy brief. No blocking source or visitor-layout issue was found.

## Verification

Followed deploy brief steps 1–7. Verified Cloudflare identity/account and GitHub
`diazdestination` / repository 1396308770. Used a separate Codex worktree.

- Built detached exact source: 25 prerendered routes plus privacy; 88/88 Windows
  tests, zero skips/failures; release gate passes with the existing labeled draft
  privacy policy; 24 local and 24 production discovery pages pass.
- Dist has 226 files; all 171 assembly assets unchanged. Single reviews section,
  complete plain-text lead review, two license strings, no ratings/stars, and both
  ownership-verification files checked. Bundles are index-BkfOMtQ1.js,
  index-D6Mykxj-.css and VoiceDesk-CzWbh7oJ.js.
- Native Chrome through CUA, with screenshots and computed geometry/opacity
  sampled every 20 CSS px forward and 40 px reverse: local build, hosted candidate
  at 0%, and direct production each checked at 390×844 and 375×548.
  The heading/facts are readable above the docked Call/Book bar; the complete lead
  review stays clear of the viewport top and bar while pinned; all 45 words light
  in reading order, followed by “Blake Turner, Google review”. Joseph Messina and
  the other three reviews appear below without overlap; each full review and
  attribution was readable. Reverse ordering passes. The separation is about
  48 px (47.84 px minimum on the short viewport, including subpixel rounding).
- Sampled completed-review/byline holds are 120 px at 375×548 and 180 px at
  390×844. A finer local 10 px/300 ms settled check measured 730 px with the lead
  visible and zero clipped samples. Sampling thresholds/easing affect these
  measurements; these are not physical-device swipe or dwell guarantees.
- All three existing assembly captions, their complete bodies and maintenance
  link clear the docked bar in forward/reverse order in all three environments.
  Final caption bottom: 464.80 < bar top 477.75 at 375×548;
  760.80 < 773.75 at 390×844.
- Forced-touch candidate test reports maxTouchPoints=1. A native upward drag moves
  from the reviews heading through the section to services; a downward drag returns
  to the heading. No scroll trap observed. This is emulation, not a real iPhone.
- Desktop 1440×900 local and production sweeps pass; production list has two
  560 px columns. Native wheel input continues to the services heading.
  Reduced-motion local and production readback: class `reviews`, static pin,
  five reviews and heading/links fully shown, no live pinning.
- Thermostat demonstration responds 70→71→70. Approved phone remains
  (706) 502-0877. Assistant disclosure opens and reports ready; consent/start
  untouched, no conversation or upload. Existing Turnstile/debugger diagnostics
  observed; no challenge solved or assistant conversation acceptance claimed.
- All 226 candidate and all 226 production served files match the build SHA-256s.
  GET /api/lead ready:true; GET /api/elevenlabs/status ready:true,
  text:true/voice:false; /api/outdoor remains 404. No POSTs/test leads.

## Preservation and test mechanics

Downloaded and re-uploaded the live server unchanged, SHA-256
`15f4e6843a6d247ca0fa8036679ecb088f5383921ae3fdbd978314e3898ec5ef`.
Candidate server ETag, all 18 binding fingerprints, runtime and /api/* worker-first
routing match the baseline. Fresh production snapshots retain settings, schedule,
subdomain and both custom domains. No source Worker/config wholesale deployment.

The initial override request before registering the uploaded version returned the
old frontend/new-bundle 404s. Added the candidate to the current deployment at 0%,
with the original at 100%, then all 226 hashes passed. The candidate browser proxy
allows GET only and adds the override to every upstream request. Normal traffic
was not switched until candidate phone checks passed.

An initial large assembly jump was measured before CSS smooth scrolling reached
the pin. Confirmed the in-transit position and corrected test positioning to
`behavior:instant`; repeated settled and forward/reverse checks pass. No product
code adjustment was made. Browser Harness execution was blocked by Windows
Application Control; used available native Chrome CUA controls, without changing
protections or running an executable workaround. Recordings/traces stayed off.

## Remaining checks and rollback

Physical iPhone/Safari remains unverified. Adam's next check: swipe down and back
up through the live reviews and assembly sections on a real iPhone; confirm every
review/caption remains readable above the bar and scrolling continues. No further
publish approval is needed for this completed release.

If a production check subsequently fails or Adam requests rollback, send 100% to
`00cde59b-827b-4c9c-85b6-773d84d4eaf5`. No rollback was required in this release.
No merges, main update, assistant configuration, GrowthOS/outbox/Resend write,
search submission, DNS/WAF/secret/binding change, or server-code change.

Evidence: `C:\Forge\artifacts\css-reviews-scroll-20261113\` — STATUS.md,
browser-observations.json, baseline/candidate/production preservation snapshots,
asset manifests, candidate/production HTTP receipts, build/test/discovery logs,
and completion.json. Native screenshots are in the Codex tool transcript.
