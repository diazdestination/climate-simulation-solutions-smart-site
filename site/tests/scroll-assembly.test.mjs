// The homepage's scroll-driven illustration (DECISIONS.md, 2026-11-13): a frame sequence drawn
// to a canvas as the visitor scrolls, a still picture for everyone who cannot or should not get
// the effect, and nothing that takes over scrolling.
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { ensureBuilt, read, root } from "./helpers.mjs";
import { routeFor } from "../src/routes.js";
import { ASSEMBLY, ASSEMBLY_ALT, ASSEMBLY_NOTE, ASSEMBLY_STAGES, LEAD, frameUrl, loadOrder, nearestLoaded, progressFor, stageAt } from "../src/content/system-assembly.js";

const CLOUDFLARE_ASSET_LIMIT = 25 * 1024 * 1024;
const escapeHtml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const sizeOf = (url) => statSync(path.join(root, "public", ...url.split("/").filter(Boolean))).size;
// Width and height from a lossy WebP's own header (VP8 chunk).
const webpSize = (url) => {
  const bytes = readFileSync(path.join(root, "public", ...url.split("/").filter(Boolean)));
  assert.equal(bytes.toString("latin1", 12, 16), "VP8 ", `${url} is a lossy WebP`);
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
};

test("frames: every one the page asks for exists, at the stated size, inside the byte budget", () => {
  const budget = { full: 5_000_000, phone: 3_000_000 };
  for (const [set, expected] of Object.entries(ASSEMBLY.sets)) {
    const dir = path.join(root, "public", "assets", "assembly", set);
    assert.equal(readdirSync(dir).length, ASSEMBLY.frames, `${set}: re-run scripts/make-scroll-frames.py and update ASSEMBLY.frames`);
    let total = 0;
    for (let index = 0; index < ASSEMBLY.frames; index += 1) {
      const url = frameUrl(set, index);
      assert.ok(existsSync(path.join(root, "public", ...url.split("/").filter(Boolean))), `${url} exists`);
      const bytes = sizeOf(url);
      assert.ok(bytes < 150_000, `${url} is ${bytes} bytes; a frame should be tens of kilobytes`);
      total += bytes;
    }
    assert.ok(total < budget[set], `${set} set is ${total} bytes, over its ${budget[set]} budget`);
    assert.deepEqual(webpSize(frameUrl(set, 0)), expected);
    assert.deepEqual(webpSize(frameUrl(set, ASSEMBLY.frames - 1)), expected);
  }
  assert.deepEqual(webpSize(ASSEMBLY.poster), ASSEMBLY.sets.full);
  assert.ok(sizeOf(ASSEMBLY.poster) < 120_000);
  assert.ok(sizeOf(frameUrl("full", 0)) < CLOUDFLARE_ASSET_LIMIT / 100, "nowhere near Cloudflare's 25 MiB per-file limit");
  assert.ok(existsSync(path.join(root, "media", "system-assembly.mp4")), "the source clip is kept so the frames can be remade");
  assert.ok(!existsSync(path.join(root, "public", "assets", "system-assembly.mp4")), "the clip itself is never published");
});

test("scroll maths: progress, captions and the order frames load in", () => {
  // 1000 px screen, track 2600 px tall (260vh).
  assert.equal(progressFor(900, 2600, 1000), 0, "nothing plays while the track is still below the fold");
  assert.equal(progressFor(500, 2600, 1000), 0, "it starts when the track's top is half a screen down");
  assert.ok(progressFor(0, 2600, 1000) > 0.2 && progressFor(0, 2600, 1000) < 0.3, "the parts have appeared by the time it pins");
  assert.equal(progressFor(-1600, 2600, 1000), 1, "finished when the pin lets go");
  assert.equal(progressFor(-1480, 2600, 1000), 1, "and held for a moment before that");
  assert.equal(progressFor(-5000, 2600, 1000), 1);
  assert.equal(progressFor(0, 800, 1000), 1, "a track shorter than the screen cannot scrub");

  assert.equal(ASSEMBLY_STAGES.length, 3);
  assert.equal(ASSEMBLY_STAGES[0].from, 0);
  assert.deepEqual([0, 0.35, 0.36, 0.57, 0.58, 1].map((p) => stageAt(p)), [0, 0, 1, 1, 2, 2]);
  // Wide layout, 900 px screen: the first caption is still the marked one when the section pins,
  // and stays marked for a visible stretch of scrolling after that.
  assert.equal(stageAt(progressFor(0, 2340, 900)), 0);
  assert.equal(stageAt(progressFor(-150, 2340, 900)), 0);
  for (const [a, b] of [[0, 1], [1, 2]]) assert.ok(ASSEMBLY_STAGES[a].from < ASSEMBLY_STAGES[b].from);

  const order = loadOrder(ASSEMBLY.frames);
  assert.deepEqual(order.slice(0, 2), [0, ASSEMBLY.frames - 1], "both ends first");
  assert.deepEqual([...order].sort((x, y) => x - y), Array.from({ length: ASSEMBLY.frames }, (_, i) => i), "every frame once");
  const early = new Set(order.slice(0, 12));
  assert.ok([12, 24, 36, 48, 60, 72].every((i) => early.has(i)), "then a coarse pass across the whole clip");

  const loaded = new Array(10).fill(null);
  assert.equal(nearestLoaded(loaded, 4), -1);
  loaded[0] = loaded[9] = {};
  assert.equal(nearestLoaded(loaded, 3), 0);
  assert.equal(nearestLoaded(loaded, 6), 9);
  loaded[6] = {};
  assert.equal(nearestLoaded(loaded, 6), 6);
});

test("one-column layout: every caption is current for a readable stretch after the section has pinned", () => {
  // The first production check (2026-11-13) failed on a phone: with the wide layout's timing the
  // first caption was only current while the section was still sliding in, behind the docked
  // bar. In one column only the current caption is shown, so each must last while pinned.
  const css = read("src", "home.css");
  const tablet = css.slice(css.indexOf("@media (max-width: 980px)"), css.indexOf("@media (max-width: 560px)"));
  const trackScreens = Number(tablet.match(/\.assembly--live \.assembly__track \{ height: (\d+)vh; height: (\d+)svh; \}/)?.[2]) / 100;
  assert.ok(trackScreens >= 2.2, "the stacked track height was read from the stylesheet");
  assert.match(read("src", "components", "SystemAssembly.jsx"), /window\.matchMedia\("\(max-width: 980px\)"\)/, "the script and the stylesheet agree on where one column starts");
  for (const screen of [568, 664, 844, 1180]) {
    const track = screen * trackScreens;
    const pinnedScroll = track - screen;
    const current = (scrolled) => stageAt(progressFor(-scrolled, track, screen, LEAD.stacked), true);
    assert.equal(current(0), 0, `${screen}px: the first caption is current at the moment the section pins`);
    const held = [0, 0, 0];
    for (let scrolled = 0; scrolled <= pinnedScroll; scrolled += 1) held[current(scrolled)] += 1;
    for (const [index, pixels] of held.entries()) {
      assert.ok(pixels >= screen * 0.3, `${screen}px: caption ${index + 1} is current for ${pixels}px of pinned scroll, under 30% of a screen`);
    }
    assert.equal(progressFor(-pinnedScroll, track, screen, LEAD.stacked), 1, "and the clip has finished when the pin lets go");
  }
  for (const stage of ASSEMBLY_STAGES) assert.ok(stage.fromStacked >= stage.from, "stacked captions never change earlier than the wide ones");
  assert.deepEqual([0, 0.42, 0.43, 0.71, 0.72, 1].map((p) => stageAt(p, true)), [0, 0, 1, 1, 2, 2]);
  assert.ok(LEAD.stacked < LEAD.wide);
});

test("captions: plain statements, no offers or promises, and a link that goes somewhere real", () => {
  for (const stage of ASSEMBLY_STAGES) {
    assert.ok(stage.title && stage.text.length > 40);
    assert.doesNotMatch(`${stage.title} ${stage.text}`, /discount|special|% off|free|guarantee|same.day|24\/7|certified|insured|\$\d/i);
    if (stage.link) assert.ok(routeFor(stage.link.href), `${stage.link.href} is a route`);
  }
  assert.match(ASSEMBLY_NOTE, /illustration/i, "the picture is labelled as an illustration");
  assert.match(ASSEMBLY_ALT, /^Illustration of /);
});

test("built homepage: a still picture and all three captions, with no scroll effect switched on", () => {
  ensureBuilt();
  const html = read("dist", "index.html");
  const section = html.match(/<section class="assembly" aria-labelledby="assembly-title">.*?<\/section>/s)?.[0];
  assert.ok(section, "the section is prerendered without the live or playing classes");
  assert.ok(html.indexOf('id="services-title"') < html.indexOf('id="assembly-title"') && html.indexOf('id="assembly-title"') < html.indexOf('id="steps-title"'), "between services and the request steps");
  assert.match(section, new RegExp(`<img src="/assets/assembly/poster\\.webp" width="720" height="1280" alt="${escapeHtml(ASSEMBLY_ALT)}" loading="lazy" decoding="async"/>`));
  assert.match(section, /<canvas aria-hidden="true"><\/canvas>/);
  assert.ok(section.includes(`<figcaption>${escapeHtml(ASSEMBLY_NOTE)}</figcaption>`));
  for (const stage of ASSEMBLY_STAGES) {
    assert.ok(section.includes(`<h3>${escapeHtml(stage.title)}</h3><p>${escapeHtml(stage.text)}</p>`), stage.title);
  }
  assert.doesNotMatch(section, /is-current/, "no caption is singled out until the effect is running");
  assert.doesNotMatch(section, /class="button/, "no Call or Book button here: the docked bar has them");
  assert.ok(existsSync(path.join(root, "dist", "assets", "assembly", "phone", "000.webp")), "frames are copied into the build");
  assert.doesNotMatch(html, /assets\/assembly\/(full|phone)\//, "no frame is requested by the page's HTML");
});

test("the effect never takes over scrolling and stands down when asked", () => {
  const src = read("src", "components", "SystemAssembly.jsx");
  assert.doesNotMatch(src, /preventDefault|addEventListener\("(wheel|touchmove|touchstart)"|scrollTo|scrollBy|scrollIntoView/, "it reads the scroll position and nothing else");
  assert.match(src, /window\.addEventListener\("scroll", onScroll, \{ passive: true \}\);/);
  assert.match(src, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
  assert.match(src, /navigator\.connection\?\.saveData === true/);
  assert.match(src, /if \(!reduce && !saveData && canDraw\) setLive\(true\);/);
  assert.match(src, /rootMargin: "150% 0px"/, "frames are not fetched until the section is close");
  assert.match(src, /if \(near && !started\) \{\s+started = true;\s+pump\(\);/);

  const css = read("src", "home.css");
  assert.doesNotMatch(css, /touch-action:\s*none/);
  assert.doesNotMatch(css, /overscroll-behavior|scroll-snap/);
  const rules = css.split("\n").filter((line) => line.includes(".assembly"));
  const pinned = rules.filter((line) => /position: sticky|height: \d+s?vh/.test(line));
  assert.ok(pinned.length >= 4);
  for (const line of pinned) assert.match(line.trim(), /^\.assembly--live /, `only the live state is tall or pinned: ${line.trim().slice(0, 70)}`);
  assert.match(css, /\.assembly--live \.assembly__pin \{ padding-bottom: calc\(5\.2rem \+ env\(safe-area-inset-bottom, 0px\)\); \}/, "on phones the pinned view ends above the docked bar");
});
