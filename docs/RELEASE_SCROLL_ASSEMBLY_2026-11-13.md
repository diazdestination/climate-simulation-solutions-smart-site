# Scroll assembly release attempt — rolled back

Historical first attempt. The [corrected retry](RELEASE_SCROLL_ASSEMBLY_RETRY_2026-11-13.md)
was subsequently published; its record supersedes the current-state statements below.

The new frontend is **not live**. The original homepage is restored at 100% after a
production phone-layout check failed. No frontend correction was included in this release task.

## Source and authorization

- Repository: `diazdestination/climate-simulation-solutions-smart-site`.
- Requested branch: `claude/css-scroll-assembly-20261113`, reviewed head
  `79f283816812dc8db97d82de97be8cc4e6b353cf`.
- Built detached source: `ac93195bd7f6d451058c724304975f48c9bfb842`.
  `ac93195..79f2838` changes only the deploy brief and `DECISIONS.md`.
- Adam's words, supplied in the Codex request as a relay from Claude, attributed to
  2026-11-13 about 02:53 Eastern:
  > I'm just ready to check it out live first and then if I need it fixed I'll ask you. I just want codex to publish it now
- His earlier choice was relayed as "1 for now": Codex performs publication and Claude
  prepares the release and brief. Codex accepted this relay for this particular clip and release.
  It was not independently read from the claude.ai conversation.
- The separate ongoing Claude ownership assignment remains pending Adam's direct confirmation.
  No `AI_PUSH_AUTHORITY.json` or collaboration policy was changed. Claude's prior push was
  reviewed retrospectively; this record does not grant standing push authority.

## Versions and traffic

| Event | ID / time (UTC) |
|---|---|
| Candidate version | `ed03920d-07b4-4e62-b059-2ee3a88a5098` |
| Candidate 100% deployment | `a52668a6-2412-4c21-a3e3-330806bfd620` |
| Promotion time | `2026-11-13T08:02:10.527542Z` |
| Rollback / currently live version | `f7ec6109-c8dd-47d0-92c8-231db5d81286` |
| Rollback deployment | `5f58dc1b-692d-4ac7-b9c5-9bdfc02170df` |
| Rollback time | `2026-11-13T08:03:47.204465Z` |

Cloudflare OAuth identity and account were freshly verified against the account map.
The exact live server was downloaded, not built from Git, and uploaded with `no_bundle`,
`--keep-vars` and retained binding metadata alongside the new assets. Its SHA-256 remained
`15f4e6843a6d247ca0fa8036679ecb088f5383921ae3fdbd978314e3898ec5ef`.
All 18 binding fingerprints, runtime/API-first asset routing, schedules, settings and domains
matched the baseline before staging, after staging, in production and after rollback.

An extra HTTP probe immediately after upload returned baseline files: the candidate was not
yet in the active deployment, so its override did not select it. Added it at 0% with the
baseline at 100%, following the November 11 method, then all 226 candidate hashes passed.
No normal visitor traffic was switched until that verification succeeded.

## Checks and production finding

- Local: 25 prerendered routes plus privacy; 81/81 Windows tests, no skips; release gate
  publishable with the existing labeled draft privacy policy; 24 discovery pages pass.
- Inventory: 226 files, 85 full frames, 85 phone frames and poster. No MP4. Required ownership
  files and HTML assertions pass. The existing 1.30 MB logo is byte-identical to the prior
  release source; all new files are below 1 MB. Bundle names match the brief's Linux names.
- Native Chrome local desktop and 390x844 checks showed frame changes, reverse scroll,
  background blending, continuation to the request steps, and reduced-motion still/all-caption
  fallback. The local check missed the first-caption clearance defect subsequently found in production.
- Candidate production: all 226 files matched local SHA-256; all 24 discovery pages passed.
  Poster and the four boundary frame samples returned `image/webp`. Initial phone-page load
  requested no full/phone frames; approaching the section fetched the phone sequence.
- `GET /api/lead`: HTTP 200, `ready:true`. `GET /api/elevenlabs/status`: HTTP 200,
  `ready:true`, text on, voice off. `/api/outdoor` remained 404.
- **Failed phone acceptance:** at 390x844 in Chrome device emulation, the first caption,
  "The parts that move heat", is obscured by the fixed Call/Book bar during entry. Scrolling
  far enough for the caption body to clear the bar has already selected the second caption.
  Forward and reverse scrolling reproduced it. The second and third captions clear the bar;
  that does not satisfy the three-caption phone requirement. Rolled back under step 6.
- Source evidence: `site/src/content/system-assembly.js:32` switches at progress 0.2;
  lines 81–85 start progress half a viewport early. With the 240svh phone track in
  `site/src/home.css:205`, the second caption begins while the track top is still about
  0.1428 viewport heights below the screen top (about 121 px at 844 px height). The sticky
  pin and bottom padding at CSS lines 136 and 239 do not make the first caption readable
  before that transition. A future correction must coordinate caption timing with entry/clearance.
- After rollback: all 55 previous-release files matched their recorded SHA-256, all 24
  discovery pages passed, readiness GETs passed, and a fresh browser page had no assembly section.

Evidence folder: `C:\Forge\artifacts\css-scroll-assembly-20261113`, including
`phone-first-caption-obscured.png`, status, local logs, manifests, preservation snapshots,
staged verification, candidate/production HTTP checks and rollback checks.
Browser Harness was blocked by Windows Application Control; native CUA/Chrome DevTools UI
was used without changing that protection. No browser recording or trace was enabled.

## Open and untouched

Physical iPhone/Safari acceptance remains open. The full production desktop/reduced-motion,
assistant interaction and thermostat interaction sweep, plus the candidate's nonexistent
`full/085.webp` negative check, were not completed after the phone failure required rollback.
The phone bar/number were visible; assistant readiness alone does not establish a chat session.
No test lead, assistant conversation, GrowthOS/outbox/Resend write, search submission,
server rebuild, secret/binding/DNS/route change, merge or main update was performed.

The next release needs a corrected, reviewed phone-caption implementation and a new scoped
publication instruction. No new account sign-in is needed for this result. Adam can confirm
the separate Claude ownership request independently; it did not delay this attempt.
