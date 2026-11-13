# Decisions

## 2026-11-13 — A second thing moves on the homepage: the system, assembled by scrolling (Adam, in Claude chat)

- **Request.** Adam asked what format a video needs so it "plays as the user scrolls down",
  whether that could be applied to csshvac.com, and then sent a six-second clip
  (720 by 1280, 24 frames a second) of a heating and cooling unit coming together out of its
  parts. He has not yet seen the built section, its placement or its wording.
- **This changes a rule.** The 2026-11-10 design pass said "the hero is the only thing that
  moves". The homepage now has one more moving thing, added at Adam's request. It moves only
  while the visitor scrolls and never on its own. Nothing else on the page should start moving
  because of this entry.
- **Frames, not a video file.** Scrubbing a normal video with the scrollbar stutters, most of
  all on iPhones and when scrolling back up, because a browser can only jump cheaply to a
  keyframe. The clip is turned into 85 still frames (`site/scripts/make-scroll-frames.py`,
  from `site/media/system-assembly.mp4`) and drawn to a canvas. Two sets: 720 px wide
  (3.6 MB) and 480 px wide for phones and slow connections (2.0 MB). The largest single file
  is 55 kB; Cloudflare's limit per file is 25 MiB.
- **Where.** After the services index and on the same paper colour, so the light band reads
  as one chapter: what CSS works on, then what is inside it. The hero and its thermostat are
  untouched.
- **How the clip sits on the page.** The clip's backdrop is an uneven light grey. The script
  levels it to pure white and the page lays the frames over the paper with multiply, so only
  the equipment and its floor shadow show. The cabinet doors swing in from outside the picture,
  so the left and right edges fade out instead of ending in a hard line.
- **It never holds the scroll.** No wheel or touch handling and no scroll snapping. The page
  scrolls natively and the section only reads how far it has got (the thermostat's
  2026-11-11 phone bug is the reason this is a test). The section pins for about a screen and
  a half of scrolling on phones and a little more on desktop.
- **It costs the top of the page nothing.** No frame is requested until the section is within
  a screen and a half. The prerendered HTML is a still picture beside three captions, and it
  stays a still for reduced motion, for data saver and without JavaScript.
- **Phones.** Pinned, the picture takes the screen and the three captions share one place
  under it. The pinned view ends above the docked Call and Book bar. No Call or Book button is
  added, so the bar is still the one set of actions on the screen.
- **Wording (written by Claude, not yet reviewed by Adam or the owner).** Heading: "A lot has
  to work together before the air feels right." Three captions in general terms about central
  air conditioners and heat pumps, the last linking to `/maintenance-plans/`. No price,
  promise, response time or credential. The text lives in
  `site/src/content/system-assembly.js`.
- **Open: the clip is not a true picture of a unit.** The 2026-11-10 rule also said "every
  graphic shows something true". In this clip the compressors, the fan and a small coil end up
  outside the closed cabinet, the lettering on the fan and the compressor labels is not real
  writing, and parts fade into existence. It is labelled on the page as "An illustration, not
  a diagram of your equipment", the way the thermostat is labelled a demonstration. Someone
  who works on these units will still see that it is not how one is built. Replacing the clip
  with an accurate one is a re-run of the script and needs no code change. Adam decides
  whether this clip ships.
- **Source resolution.** The clip is 720 px wide, which is sharp on phones and slightly soft
  on a large high-density desktop screen. A 1080 px wide source would fix that.
- **Checked** in Chrome at 390 by 664, 820 by 1180 and 1440 by 900: no console errors, no
  sideways scroll, no frame requests on load, the right frame set per width, each caption
  taking over in turn, a mouse wheel carrying straight through to the bottom of the page, no
  long main-thread tasks while scrubbing up and down, and the still version under reduced
  motion. Not checked on a physical phone or in Safari from here.

## 2026-11-11 — Buttons, cards and forms rebuilt as one system (Adam, in Claude chat)

- **Request.** Adam sent a phone screenshot of the homepage buttons and triage chips and asked
  for the site's cards and "generic interactive buttons" to be improved. He was shown three
  before-and-after mock-ups and approved building the direction across the site.
- **Keys.** Every pressable control is the same object: a solid plate on a darker lower edge
  that it drops onto when pressed. No gradients, glass or glow. The amber key is a page's main
  action. This covers buttons, the phone action bar, triage tiles, urgent issue keys, yes/no
  and preferred-time toggles, the thermostat's plus and minus, the menu and close buttons and
  the assistant's start button. One CSS rule in `site/src/styles.css` gives all of them the
  press. `main.jsx` registers an empty touch listener because iOS Safari only shows a pressed
  state when the page has one.
- **One set of actions per phone screen.** On phones, Call and Book service are docked to the
  bottom of the screen as a solid bar. Any button in the page that would repeat them carries
  the class `in-mobile-bar` and is left out at phone width, so the homepage no longer shows the
  same two buttons twice. Desktop and tablet keep every button. On the booking page the bar is
  Call alone (the page is the form). On the urgent page the bar is Call alone in amber, and
  "Book service" is not offered there. A service page keeps its own action when the bar does
  not have it (for example "Get urgent help").
- **Triage in two tiers.** The seven identical chips are now three keys for what cannot wait
  (no heat, no AC, water leaking), each with an icon and a coloured cap, and four plain rows
  for what can be planned. Same links, same order by season (`triageFor` in
  `site/src/lib/season.js`).
- **Shape.** Three radii and no others, down from thirteen: 10 px for anything pressed or typed
  in (`--r-control`), 14 px for panels that hold controls (`--r-surface`), and fully round.
- **Depth.** Three steps: a well (inputs) is level with the page, a surface (forms, dialogs,
  plan cards) sits above it, a key sits above that. One drop shadow (`--float`), used only on
  things that float over the page: the assistant, the open menu and the privacy notices.
- **Colour.** A coloured cap or icon on a tile means warm air (amber), cool air (blue) or water,
  on the homepage tiles and the urgent issue keys alike. The two plan cards borrow amber and
  blue only to tell the plans apart; that is not a claim about heating or cooling. Cyan marks a
  choice that is switched on, with a ring and a filled check so it never depends on colour.
- **Fewer boxes.** Service-page sections, the "What happens next" notes beside forms and the
  license line in the reviews section are plain text with a rule, not outlined boxes. "Other
  services" and "Nearby communities" are rows with a chevron in place of empty cards. The form
  is the one surface on its page.
- **Plan cards** lead with one figure, visits in a year (2 and 4), worked out from the approved
  cadence wording by `visitsAYear` in `site/src/lib/siteFacts.js`. The approved wording ("One
  visit every six months", "Quarterly visits") is still printed under it. A cadence the table
  does not know shows no figure, and a test fails so the table is updated instead of guessed.
- **Urgent page.** Issue keys locked behind the safety questions are flat outlines at full
  reading contrast with a lock line above them; they used to be the real cards at 50% opacity.
  They are now real buttons in a list (they had `role="listitem"`, which hid the button role
  from screen readers).
- **Forms.** Sentence-case group headings with a rule between groups, inputs as wells, the
  site's own arrow on selects, toggle keys over the real radios and checkboxes (still reachable
  and operable by keyboard), no arrow on the submit button, and the form runs edge to edge on
  phones. Field names, required fields, consent wording and what is sent to the office are
  unchanged.
- **Not changed:** any stated fact, any route, the hero's thermostat and airflow, the request
  payload, the assistant's behaviour.
- **Rule for future work:** a new control is a key, a new panel is a surface, and a new radius,
  gradient-filled control or second drop shadow fails `site/tests/ui-system.test.mjs`.
- **Checked** in Chrome at 390, 820 and 1440 px on every page type, with the assistant and the
  menu open: no console errors, no sideways scroll, each kind of key drops when pressed, yes/no
  keys work from the keyboard, and the thermostat scroll test from the entry below still
  passes. Not checked on a physical phone from here.

## 2026-11-11 — Homepage thermostat no longer traps scrolling on phones

- **Report (Adam):** on a phone the page "seems to freeze on the down scroll" at the thermostat.
- **Cause 1, touch.** The dial's ring had `touch-action: none` and changed the temperature the
  moment a finger landed on it. On a phone the dial fills the middle of the first screen, so a
  thumb that landed on the ring to scroll either moved nothing or turned the dial instead.
- **Fix.** `touch-action: pan-y` on the dial's HTML box (`.thermostat`), never `none`, and never
  on the SVG shapes, where browsers do not apply it reliably. A touch now does nothing when it
  lands: a tap sets the temperature, a sideways drag turns the dial, and an up-or-down swipe
  scrolls the page. Mouse, keyboard and the plus and minus buttons are unchanged.
- **Cause 2, load.** The airflow canvas pre-drew 90 animation steps in one go on load and again
  0.6 seconds later, blocking the page for up to about 0.1 s each time on a desktop and several
  times that on a phone. It now draws one frame per frame and lets the trails build up; the
  0.6-second pass only re-reads where the thermostat is. The dial's glow is a gradient instead
  of a filter that was repainted ten times a second.
- **Tested** in Chrome's iPhone emulation with real touch sequences (swipes starting on six
  parts of the dial all scroll the page and leave the dial alone; tap and sideways drag still
  work; no long main-thread tasks during load). Not tested on a physical iPhone from here.

## 2026-11-11 — Twelve communities are served, each with its own page (Adam, in Claude chat)

- **Coverage is now stated, not hedged.** Adam confirmed CSS serves Dahlonega, Cumming,
  Gainesville, Jasper, Ball Ground, Canton, Buford, Alpharetta, Cleveland, Roswell, Johns Creek
  and Atlanta "for sure". The site no longer says "communities you can call to check" or "not a
  promise of service". `serviceArea.summary` in `site/site.config.mjs` names all twelve.
- **One page per town** at `/service-areas/<town>-ga/`, plus the existing Dawsonville page on
  the same template. Town data lives in `site/src/content/area-map.js`; the pages are generated
  in `site/src/content/pages.js`, so adding or removing a town is a one-line change.
- **What a town page says:** that the town is served, its county, a one-line description of
  where it is, its straight-line distance from Dawsonville (computed, rounded to the mile), the
  five services, how to request a visit, and the nearest other towns. Each page shows the
  service-area map with that town picked out.
- **What a town page does not say:** response or arrival times, 24-hour availability, prices, or
  coverage of a whole county. The after-hours wording is the already-approved "emergency-hours
  requests; response depends on availability and location".
- **"Forsyth" stays held.** The owners' October list did not say county or city. Cumming, the
  Forsyth County seat, has a page.
- **Map.** Rings are now 10, 25 and 50 miles and the frame is taller, because Atlanta is about
  49 miles south of Dawsonville.
- **Structured data.** The business lists all thirteen cities as `areaServed`, and each town
  page carries a `Service` entry for that town. The sitemap grows from 12 to 24 URLs, and
  `scripts/check-discovery.py` now expects 24.
- **Assistant not yet updated.** The live AI assistant still describes the service area as
  "surrounding North Georgia communities; call with the service address to confirm
  availability". Re-provisioning it from this branch brings it in line; that needs Adam's
  approval because it changes a live assistant.

## 2026-11-10 — Phone, hours, license and the living homepage (Adam, in Claude chat)

- **Phone: (706) 502-0877.** The CSS owner gave Adam this number for the site "until they say
  otherwise". It replaces (706) 809-5076 everywhere the site publishes a number (config, schema,
  llms.txt, privacy page). Open question for the owner: what happens to 809-5076 on the Google
  and Facebook listings, since mismatched numbers hurt local search.
- **Hours: Monday–Friday 9 a.m.–5 p.m., Saturday and Sunday 8 a.m.–6 p.m.**, as published on
  the old csshvacga.com site. Adam chose these over the Mon–Fri 7–5 recorded on 2026-10-14.
  `site.hoursSchedule` is now a list of day blocks so the open/closed badge covers weekends.
- **License no. 23196912** (from the owner via Adam). The owner did not say which board issued it
  or what class it is, and Georgia conditioned-air contractor numbers normally start with CN or
  CR, so the site prints "License no. 23196912" and names neither. Confirm the type before
  adding words such as "Georgia" or "conditioned air" next to it.
- **Reviews.** The homepage quotes five Google reviews word for word, copied from the old site
  (`site/src/content/reviews.js`), and links to the Google profile. No rating number or review
  count is published and no rating markup is emitted. Facebook and unattributed reviews from the
  old site are left out. The owner has not yet been asked to approve showing them.
- **"Insured" and "Locally owned" are not shown.** The old site published both, but neither
  has been confirmed with the owner and `site/src/content/pages.js` lists licensing and
  insurance wording as held until approved. Add them back only after the owner confirms.
- **Homepage hero.** The illustrative dusk photo is replaced by a canvas of moving air and a
  thermostat visitors can turn. It is labeled on the page as a demonstration. Symptom-first
  triage links replace the four path cards. The mobile bar now offers Call and Book service.
- **Design pass (same day).** Adam asked for the page to be reviewed against generic,
  template-looking patterns. Changed as a result: display type is Archivo set slightly wide in
  place of Manrope (one variable, `--display` in `site/src/styles.css`, plus one import in
  `main.jsx` to switch back); all-caps tracked labels above headings are gone or sentence case;
  services are a plain index without 01–05 numbers (they are not a sequence); the three request
  steps keep their numbers (they are); the orbit-ring logo panel is removed; the decorative
  radar is replaced by a true map (`site/src/content/area-map.js`: real bearings and distances,
  10/20/30-mile rings, the first eight approved call-to-check towns); the closing section sets
  the phone number as the largest type on the page; decorative arrows on buttons are removed.
  Rule for future work on this page: amber means warm air and blue means cool air, the hero is
  the only thing that moves, and every graphic shows something true.
- **Outdoor temperature.** `/api/outdoor` (in `site/worker/`) returns the National Weather
  Service hourly forecast temperature for Dawsonville, cached 15 minutes. The worker makes the
  request, so no visitor data reaches weather.gov and the privacy policy needs no new
  processor. Production currently runs an older server module that has no such route; until
  the worker is redeployed the hero shows a season line instead of a temperature.

## 2026-10-14 — Launch decisions "1c, 2 yes" (Adam, relayed in Claude chat)

- **Pre-GrowthOS email fallback (1c).** Until the CSS GrowthOS site record exists, web leads are
  emailed to the owners through the core email bridge (`emailBridge: { enabled: true,
  preGrowthOS: true }`, `wrangler.jsonc` `SMART_SITE_GROWTHOS_ENABLED: "false"`,
  `SITE_EMAIL_ENABLED: "true"`). Alerts go through **Resend** from the verified mogulforge.ai
  domain with the display name "MogulForge Lead Alerts" (Adam, 2026-10-14, "A is perfect").
  `RESEND_API_KEY`, the sender address and the owner addresses are secrets set by Codex, never
  committed. When Codex connects GrowthOS it sets
  `SMART_SITE_GROWTHOS_ENABLED=true` with the site ID/secret; from then on every lead goes to
  GrowthOS and the bridge cannot send (no double alerts). If email fails the form shows an error
  and the phone number; nothing is claimed as received. Retried requests keep the same `RQ-`
  reference so a duplicate alert is recognisable.
- **Privacy policy launches as a labeled draft (2 yes).** The `privacy-policy` release gate is
  `approved-draft` with `pendingReview` naming the attorney review. `release:check` passes only
  while `public/privacy/index.html` keeps the "Draft — pending attorney review" banner and
  `noindex`, and prints the pending review on every run. This is not an attorney approval: set
  the gate to `approved` only after the review.
- Preview hosts (`*.workers.dev` or `SITE_NOINDEX=true`) are always built noindex.

## 2026-10-14 — React smart site launch decisions (Adam, relayed in Claude chat)

- **Office hours confirmed: Monday–Friday, 7 a.m.–5 p.m.** (Oct 9 owner interview). The older 9–5 in
  earlier intake docs and the HTML preview is superseded. Applied in `site/site.config.mjs`
  (`hours.summary`, `hoursSchedule`), the homepage FAQ and the assistant knowledge base.
- **Domain:** csshvacga.com is CSS's old domain (registered elsewhere, locked) and is not assumed.
  The production origin comes from `SITE_PUBLIC_ORIGIN` at build; Codex buys the approved new domain.
- **Assistant:** launch with a text-chat website assistant; spoken voice stays built in but off
  (`voice.modes.voice: false`) until CSS approves it. Live phone answering is post-launch.
- **Hero image:** the generated hero image is approved.
- **ElevenLabs:** a monthly budget cap is required (amount pending); agent limits set to 15
  conversations/day, 2 concurrent, 10-minute maximum, bursting off.
- **SMS:** no text consent until Telnyx 10DLC/toll-free registration and approved wording exist
  (`site/docs/sms-consent-telnyx.md`).

## 2026-10-09 — Existing GitHub repo and Cloudflare path

- Use the existing private `diazdestination/climate-simulation-solutions-smart-site`
  repository. Do not create a second CSS website repository.
- Preserve the owner-private ChatGPT Site and its project identity while
  preparing a separate Cloudflare candidate in `cloudflare/`.
- Base the design candidate on the exact Site version 8 source. Keep capture
  disabled and do not add a public Cloudflare route during repository preparation.
- Reconcile the October 9 owner interview with the older site intake before
  changing public hours, names, service-area claims, or contact promises.
- Keep GrowthOS tenant provisioning, durable request delivery, customer data,
  messaging, payments, and public domain release behind their own evidence gates.

## 2026-09-29 — Initial repository

- Use a private repository named `climate-simulation-solutions-smart-site`, consistent with Adam's lowercase, hyphenated product names.
- Use Next.js App Router, TypeScript, custom CSS, and a small dependency surface for the initial web app.
- Lead with trust and a persistent **Book Service** CTA; give emergency requests a distinct route.
- Model all appointments as office-approved requests. Success from the website means delivery to the intake endpoint, not confirmation of a time slot.
- Keep phone, assets, testimonials, exact financing terms, and maintenance details out of published copy until approved.
- Gate all lead delivery behind server-side secrets and HTTPS; disable forms when unconfigured.
- Keep `noindex` until public launch approval and content verification.
