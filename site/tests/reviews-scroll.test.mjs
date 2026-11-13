// The homepage reviews scene (DECISIONS.md, 2026-11-13): live text moved by the scrollbar, with
// the whole section readable when the effect is not running, and nothing that takes over
// scrolling. The reviews themselves are still checked word for word in home-experience.test.mjs.
import assert from "node:assert/strict";
import test from "node:test";
import { ensureBuilt, read } from "./helpers.mjs";
import { REVIEWS } from "../src/content/reviews.js";
import { DIM, SCENE, pinProgress, rowIn, sceneAt, wordsOf } from "../src/lib/reviewScroll.js";

const lead = REVIEWS.find((r) => r.lead);
const words = wordsOf(lead.text);
const escapeHtml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

test("lead review: split into words and put back, it is the review as written", () => {
  assert.equal(words.join(" "), lead.text);
  assert.ok(words.length > 20 && words.every((word) => word.length > 0), "no empty words, so no doubled spaces");
});

test("scene timing: the heading, then the review a word at a time, then its author, then a hold", () => {
  assert.equal(pinProgress(300, 2340, 900), 0, "nothing starts before the section has pinned");
  assert.equal(pinProgress(0, 2340, 900), 0);
  assert.equal(pinProgress(-720, 2340, 900), 0.5);
  assert.equal(pinProgress(-1440, 2340, 900), 1);
  assert.equal(pinProgress(-9000, 2340, 900), 1);
  assert.equal(pinProgress(0, 600, 900), 1, "a track shorter than the screen shows the finished scene");

  const n = words.length;
  assert.deepEqual(sceneAt(0, n), { title: 1, lead: 0, lit: 0, by: 0 }, "it opens on the heading alone");
  assert.deepEqual(sceneAt(1, n), { title: 0, lead: 1, lit: n + 1, by: 1 }, "it ends on the whole review and its author");
  // The steps come in order and never overlap: heading out, review in, words, author.
  const order = [SCENE.titleOut, SCENE.leadIn, SCENE.words, SCENE.byline].flat();
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.equal(sceneAt(SCENE.leadIn[0], n).title, 0, "the heading has gone before the review arrives, so they never sit on top of each other");
  assert.equal(sceneAt(SCENE.words[0], n).lead, 1, "the review's block is fully there before its words start to light");

  // Walk the scroll in small steps and look at it the way a visitor would.
  let previousLit = -1;
  let nothingReadable = 0;
  let held = 0;
  const steps = 2000;
  for (let step = 0; step <= steps; step += 1) {
    const scene = sceneAt(step / steps, n);
    assert.ok(scene.lit >= previousLit, "words only ever light up going down the page");
    previousLit = scene.lit;
    if (scene.title < 0.6 && scene.lead < 0.6) nothingReadable += 1;
    if (scene.lit >= n && scene.by === 1) held += 1;
  }
  assert.ok(nothingReadable / steps < 0.08, `the hand-over from heading to review is ${((nothingReadable / steps) * 100).toFixed(1)}% of the scroll`);
  assert.ok(held / steps >= 0.12, "the finished review is held for at least an eighth of the scroll before the pin lets go");
  // Every word gets its own stretch of scrolling: on a short phone (548 px, 260svh track) that is
  // more than 10 px a word.
  const perWord = ((SCENE.words[1] - SCENE.words[0]) / (n + 1)) * (548 * 1.6);
  assert.ok(perWord > 10, `${perWord.toFixed(1)} px of scroll per word on a short phone`);
  assert.ok(DIM >= 0.15 && DIM <= 0.35, "an unreached word is dim, not invisible");
});

test("list rows arrive as they come up the screen and are fully shown well before the middle", () => {
  assert.equal(rowIn(900, 900), 0, "not yet on screen");
  assert.equal(rowIn(870, 900), 0, "just inside the bottom edge");
  assert.ok(rowIn(780, 900) > 0.4 && rowIn(780, 900) < 0.6);
  assert.equal(rowIn(684, 900), 1);
  assert.equal(rowIn(450, 900), 1);
  assert.equal(rowIn(-200, 900), 1, "and it stays shown once it has passed");
});

test("built homepage: the whole section as plain, visible text, with no effect switched on", () => {
  ensureBuilt();
  const html = read("dist", "index.html");
  const section = html.match(/<section class="reviews" aria-labelledby="reviews-title">.*?<\/section>/s)?.[0];
  assert.ok(section, "prerendered without the live class");
  assert.match(section, /<h2 id="reviews-title">What customers wrote on <span>Google\.<\/span><\/h2>/);
  assert.ok(section.includes(`<figure class="review review--lead"><blockquote>${escapeHtml(lead.text)}</blockquote><figcaption>${lead.author}, Google review</figcaption></figure>`), "the lead review is one plain sentence, not word spans");
  assert.doesNotMatch(section, /style="/, "no inline numbers hide anything before the script runs");
  assert.equal(section.match(/<figure class="review">/g)?.length, REVIEWS.length - 1);
  assert.match(section, /Read every review on Google<\/a> or <a [^>]*>write your own<\/a>\./);
  assert.doesNotMatch(section, /★|aria-label="[^"]*star/i, "no star ratings are shown (see DECISIONS.md)");
  assert.doesNotMatch(section, /class="button/, "no Call or Book button here: the docked bar has them");
  assert.ok(html.indexOf('id="hero-title"') < html.indexOf('id="reviews-title"') && html.indexOf('id="reviews-title"') < html.indexOf('id="services-title"'), "still between the hero and the services");
});

test("everything defaults to shown, and only the live state is tall, pinned or faded", () => {
  const css = read("src", "home.css");
  const rules = css.split("\n").filter((line) => /\.review/.test(line.split("{")[0]));
  // Each number the script writes has a fallback that means "fully shown".
  assert.match(css, /\.review--lead blockquote span \{ opacity: clamp\(\.2, calc\(var\(--lit, 999\) - var\(--i\)\), 1\); \}/);
  assert.match(css, /\.review--lead figcaption \{[^}]*opacity: var\(--by, 1\); \}/);
  assert.match(css, /\.reviews__list \.review \{[^}]*opacity: var\(--in, 1\); transform: translateY\(calc\(\(1 - var\(--in, 1\)\) \* 28px\)\); \}/);
  assert.match(css, /\.reviews--live \.reviews__title \{ opacity: var\(--title, 1\);/);
  assert.match(css, /\.reviews--live \.review--lead \{ opacity: var\(--lead, 1\); \}/);
  for (const line of rules.filter((rule) => /opacity:/.test(rule))) assert.match(line, /opacity: (var\(--[a-z]+, 1\)|clamp\(\.2, calc\(var\(--lit, 999\))/, `no fixed fade: ${line.trim().slice(0, 70)}`);
  const pinned = rules.filter((line) => /position: sticky|height: \d+s?vh/.test(line));
  assert.ok(pinned.length >= 4);
  for (const line of pinned) assert.match(line.trim(), /^\.reviews--live /, `only the live state is tall or pinned: ${line.trim().slice(0, 70)}`);
  assert.match(css, /\.reviews--live \.reviews__pin \{ padding-bottom: calc\(5\.2rem \+ env\(safe-area-inset-bottom, 0px\)\); \}/, "on phones the pinned scene is centred above the docked bar");
  assert.doesNotMatch(css, /touch-action:\s*none|overscroll-behavior|scroll-snap/);
  assert.match(read("src", "components", "ReviewsScroll.jsx"), /const ROW_RISE = 28;/, "the script and the stylesheet agree on how far a row rises");
});

test("the effect never takes over scrolling and stands down for reduced motion", () => {
  const src = read("src", "components", "ReviewsScroll.jsx");
  assert.doesNotMatch(src, /preventDefault|addEventListener\("(wheel|touchmove|touchstart)"|scrollTo|scrollBy|scrollIntoView/, "it reads the scroll position and nothing else");
  assert.match(src, /window\.addEventListener\("scroll", onScroll, \{ passive: true \}\);/);
  assert.match(src, /const reduce = window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches;/);
  assert.match(src, /if \(!reduce && /);
  assert.match(src, /\{live \? words\.map\(/, "the review is split into words only once the effect is running");
  assert.doesNotMatch(src, /setInterval|setTimeout|animation|transition/, "nothing moves on a timer: only the scrollbar moves it");
});
