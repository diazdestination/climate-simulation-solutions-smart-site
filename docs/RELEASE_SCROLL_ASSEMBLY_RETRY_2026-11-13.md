# Corrected scroll assembly retry — live

The corrected frontend is live at https://csshvac.com/. This supersedes the current-state
conclusion of the [first attempt](RELEASE_SCROLL_ASSEMBLY_2026-11-13.md); that rollback
record remains historical evidence.

## Source and authorization

Built exact detached source `c21b65c069bf6873e9b5ca00640d2a95d8b87eae` from repository
`diazdestination/climate-simulation-solutions-smart-site`. Fetched/reviewed requested branch
`claude/css-scroll-assembly-20261113` at `bc79d724c886201328d713d204453a114024237f`.
Against `ac93195`, only the component, timing content and test change under `site/`:
60 insertions, 14 deletions. Stylesheet and171 pictures are unchanged. Source..branch-head
changes only three root/docs Markdown files; the built site tree equals the branch head.

Adam's new sentence, relayed by Claude in the Codex request, attributed to November 13
at 03:19 Eastern:

> You're the lead and what do you think I would want? Lol of cou we I want you to fix it get it published

Codex accepted this for this corrected frontend retry, together with the earlier relayed
clip/publish instruction: "I'm just ready to check it out live first and then if I need it
fixed I'll ask you. I just want codex to publish it now". Codex did not independently read
the claude.ai chat. This supersedes the brief's older statement that no instruction followed
rollback. The separate Claude standing ownership request remains pending Adam's direct
confirmation; no push-authority record changed, and that request did not delay this release.

## Deployment

| Item | Verified value |
|---|---|
| New version, 100% | `00cde59b-827b-4c9c-85b6-773d84d4eaf5` |
| Deployment | `5af0c426-f5d8-4832-8f9e-c9c8be05242c` |
| Promotion UTC | `2026-11-13T08:30:54.685621Z` |
| Confirmed rollback version | `f7ec6109-c8dd-47d0-92c8-231db5d81286` |
| Baseline deployment | `5f58dc1b-692d-4ac7-b9c5-9bdfc02170df` |
| Preserved server SHA256 | `15f4e6843a6d247ca0fa8036679ecb088f5383921ae3fdbd978314e3898ec5ef` |

Fresh Cloudflare identity/account matched the account map. Downloaded the live server and
uploaded those exact bytes without bundling, retaining variables and all five keep_bindings
types. Staged ETag,all 18 binding fingerprints, runtime/settings, schedules and custom domains
match baseline. `/api/*` remains worker-first. GitHub identity diazdestination/302037174 and
repository 1396308770 verified. Main remains `b5867bb4d437b9f9caab4c09cf8f675d5dc3a8f3`.

Candidate was uploaded without traffic, then included at 0% alongside baseline 100% for
Cloudflare overrides. All 226 candidate file hashes passed before promotion. Browser candidate
checks used a GET-only loopback proxy forwarding every request to csshvac.com with the
version override. That browser origin was localhost; later checks used production directly
without an override or proxy. No rollback was needed on this retry.

## Verification

- Exact-source Windows build: 25 prerendered routes plus privacy; 82/82 tests, no skips/failures;
  existing labeled-draft release gate;24 local discovery pages. Bundle names match the brief:
  `index-DPOMZVtT.js`,`index-BiLgr7UT.css`,`VoiceDesk-BwP70pAE.js`.
- Inventory: 226 files, 85 full + 85 phone frames and poster, no MP4, required verification files,
  HTML assertions and size limits pass. Existing 1.30 MB logo hash matches previous source;
  all new files are below 1 MB, and all files below 25 MiB.
- **Phone captions checked before upload locally, on 0% hosted candidate, and directly live:**
  Chrome 390x844 and 375x548. Once the picture holds, first caption and full paragraph clear
  the docked Call/Book bar. Continuing shows second, then third, with full paragraphs and
  maintenance link above the bar. Scrolling up restores second and first with clearance.
  Native CUA screenshots and incremental wheel inputs of 120/240/360 px were used. The original
  first-caption defect did not recur. These are visual checks, not an instrumented CSS-pixel
  dwell measurement. Native drag injection did not provide a reliable quantified touch test.
- Local/live 1440x900: first marker at pinning, then second/third; frames change, blend into the
  pale background, and free scrolling reaches Good service starts. Reduced-motion emulation
  plus reload shows one still, all 3 captions, and no pinning.
- Normal initial load, local/live: Network filter `/assets/assembly/` shows poster only and
  no full/phone frames. Frames load on approach. No recordings/traces. Test preferences restored.
- Production: 226/226 file hashes and 24 discovery pages pass. Poster and full/phone 000/084
  return 200, image/webp; full 085 returns 404, no content type or image. An initial probe assumed
  a content-type on that 404; the receipt confirmed the expected negative response and the
  assertion was corrected. This was a probe error, not a served-asset failure.
- Read-only API checks: lead 200/ready:true/email_ready; assistant status 200/ready:true,
  text:true/voice:false; outdoor 404. Final module, binding, runtime/settings, schedule/domain
  preservation readback passes.
- Hero display, bar, phone number, and assistant disclosure render. Assistant says ready;
  no consent/start action or session. Disclosure loads existing Turnstile; its own iframe
  emits data-URL CSP and GPU/font diagnostics. No challenge solved. Before disclosure the
  live console showed only expected outdoor 404. VoiceDesk bundle/server are unchanged.

Physical iPhone/Safari, reliable touch-swipe proof, exact 250–450 CSS-pixel dwell, and thermostat
touch gestures remain unverified in this retry. Next from Adam: swipe down and back up
through the live section on a real iPhone,checking all 3 captions above the bottom bar and
uninterrupted scrolling. Thermostat source/styles are unchanged; display was checked.

No lead POST, assistant conversation, GrowthOS/outbox/Resend write, search submission, server
rebuild, secret/binding/DNS/WAF/route change, main update or merge. Release records are committed
on the requested branch. Evidence lives in
`C:\Forge\artifacts\css-scroll-assembly-20261113-retry`: STATUS, build/test/gate logs, manifests,
preservation snapshots, candidate/production HTTP and discovery receipts, frame endpoints and
completion. Screenshots are in the Codex tool transcript; no separate PNG files are claimed.
