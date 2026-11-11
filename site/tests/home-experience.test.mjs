import assert from "node:assert/strict";
import test from "node:test";
import config from "../site.config.mjs";
import { ensureBuilt, read } from "./helpers.mjs";
import { routeFor } from "../src/routes.js";
import { SERVICE_ISSUES } from "../src/lib/hvacRequest.js";
import { SEASONS, TARGET_MAX, TARGET_MIN, clampTarget, isTap, modeFor, seasonFor, startsTurn, triageFor } from "../src/lib/season.js";
import { GOOGLE_PROFILE_URL, GOOGLE_WRITE_REVIEW_URL, REVIEWS } from "../src/content/reviews.js";
import { HOME_BASE, MAP_TOWNS, RING_MILES, milesFromBase, nearestTowns, offsetMiles } from "../src/content/area-map.js";
import { SERVED_COMMUNITIES } from "../src/content/pages.js";
import { currentPeriod, isOutdoorRequest, outdoorResponse } from "../worker/outdoor.js";

const escapeHtml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

test("season follows the calendar in the office time zone", () => {
  assert.equal(seasonFor(new Date("2026-01-15T17:00:00Z")), "heating");
  assert.equal(seasonFor(new Date("2026-11-10T17:00:00Z")), "heating");
  assert.equal(seasonFor(new Date("2026-07-04T17:00:00Z")), "cooling");
  assert.equal(seasonFor(new Date("2026-04-15T17:00:00Z")), "between");
  assert.equal(seasonFor(new Date("2026-10-15T17:00:00Z")), "between");
  // 02:00 UTC on Nov 1 is still Oct 31 in Georgia.
  assert.equal(seasonFor(new Date("2026-11-01T02:00:00Z")), "between");
  for (const season of Object.values(SEASONS)) {
    assert.ok(season.room >= TARGET_MIN && season.room <= TARGET_MAX);
    assert.ok(season.target >= TARGET_MIN && season.target <= TARGET_MAX);
    assert.notEqual(season.room, season.target, "the room has somewhere to go when the page loads");
    assert.doesNotMatch(`${season.note} ${season.noteCta}`, /discount|special|% off|free|guarantee|same.day|24\/7/i, "no offers or response promises");
  }
});

test("thermostat: mode and limits", () => {
  assert.equal(modeFor(66, 70), "heating");
  assert.equal(modeFor(77, 72), "cooling");
  assert.equal(modeFor(70, 70), "holding");
  assert.equal(modeFor(70.2, 70), "holding");
  assert.equal(clampTarget(95), TARGET_MAX);
  assert.equal(clampTarget(12), TARGET_MIN);
  assert.equal(clampTarget(71.6), 72);
});

test("thermostat on a phone: scrolling past it scrolls the page, only a tap or a sideways drag turns it", () => {
  // A thumb moving up or down the screen is a scroll, however far it goes.
  assert.equal(startsTurn(0, -160), false);
  assert.equal(startsTurn(6, -40), false);
  assert.equal(startsTurn(-20, 60), false, "a diagonal that is mostly vertical is still a scroll");
  // A clear sideways move turns the dial; a twitch does not.
  assert.equal(startsTurn(13, 0), true);
  assert.equal(startsTurn(-26, 2), true);
  assert.equal(startsTurn(5, 0), false);
  // Lifting the finger where it landed is a tap.
  assert.equal(isTap(0, 0), true);
  assert.equal(isTap(4, -5), true);
  assert.equal(isTap(0, 40), false);
  // The dial must never switch touch scrolling off, and the rule lives on the HTML box.
  const css = read("src", "home.css");
  assert.doesNotMatch(css, /touch-action:\s*none/, "touch-action: none on the dial traps the page scroll on phones");
  assert.match(css, /\.thermostat \{[^}]*touch-action: pan-y;/);
  const dial = read("src", "components", "Thermostat.jsx");
  assert.match(dial, /if \(touch\) return;/, "a touch does not change the temperature when it lands");
  assert.match(dial, /onPointerCancel=\{onPointerCancel\}/);
});

test("airflow never pre-draws in one long burst", () => {
  const src = read("src", "components", "Airflow.jsx");
  assert.doesNotMatch(src, /for \(let i = 0; i < \(still \? \d+ : \d+\); i \+= 1\) step\(\);/, "the old 90-step warm-up froze slow phones on load");
  assert.match(src, /window\.setTimeout\(locate, 600\)/, "the late re-measure only re-reads the thermostat position");
  assert.match(src, /STILL_BATCH = 20/);
});

test("triage: every choice lands on a real page and a real issue", () => {
  const issueIds = SERVICE_ISSUES.map((i) => i.id);
  for (const season of Object.keys(SEASONS)) {
    const items = triageFor(season);
    assert.equal(new Set(items.map((i) => i.id)).size, items.length);
    for (const item of items) {
      const url = new URL(item.href, "https://csshvac.com");
      assert.ok(routeFor(url.pathname), `${item.href} is a route`);
      const issue = url.searchParams.get("issue");
      if (issue) assert.ok(issueIds.includes(issue), `${issue} is a service issue the form accepts`);
      if (item.urgent) assert.equal(url.pathname, "/urgent/");
    }
  }
  assert.equal(triageFor("cooling")[0].id, "no-cooling", "summer leads with no AC");
  assert.equal(triageFor("heating")[0].id, "no-heat", "winter leads with no heat");
});

const forecast = (periods) => async () => new Response(JSON.stringify({ properties: { periods } }), { status: 200 });
const NOW = Date.parse("2026-11-10T18:20:00Z");
const PERIODS = [
  { startTime: "2026-11-10T12:00:00-05:00", endTime: "2026-11-10T13:00:00-05:00", temperature: 68, temperatureUnit: "F" },
  { startTime: "2026-11-10T13:00:00-05:00", endTime: "2026-11-10T14:00:00-05:00", temperature: 70, temperatureUnit: "F" },
];

test("/api/outdoor: returns the hour's forecast temperature and nothing about the visitor", async () => {
  assert.equal(currentPeriod(PERIODS, NOW).temperature, 70);
  assert.equal(currentPeriod([], NOW), null);
  const calls = [];
  const response = await outdoorResponse({
    now: NOW,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return forecast(PERIODS)();
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { tempF: 70, place: "Dawsonville", source: "National Weather Service", asOf: "2026-11-10T13:00:00-05:00" });
  assert.match(response.headers.get("cache-control"), /public, max-age=900/);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/api\.weather\.gov\/gridpoints\/FFC\/58,117\/forecast\/hourly$/);
  assert.deepEqual(Object.keys(calls[0].init.headers).sort(), ["accept", "user-agent"], "no visitor headers are forwarded");
});

test("/api/outdoor: upstream trouble is a quiet 503 so the hero falls back to the season line", async () => {
  const cases = [
    async () => new Response("nope", { status: 500 }),
    async () => {
      throw new Error("network down");
    },
    forecast([{ ...PERIODS[1], temperatureUnit: "C" }]),
    forecast([{ ...PERIODS[1], temperature: 400 }]),
    forecast([]),
  ];
  for (const fetchImpl of cases) {
    const response = await outdoorResponse({ now: NOW, fetchImpl });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "outdoor_unavailable" });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(isOutdoorRequest(new Request("https://csshvac.com/api/outdoor")), true);
  assert.equal(isOutdoorRequest(new Request("https://csshvac.com/api/outdoor", { method: "POST" })), false);
  assert.equal(isOutdoorRequest(new Request("https://csshvac.com/api/lead")), false);
  assert.match(read("worker", "index.js"), /isOutdoorRequest\(request\) \? outdoor\(request, ctx\) : worker\.fetch\(request, env, ctx\)/);
});

test("reviews: Google only, attributed, linked to the public profile, no rating numbers", () => {
  assert.ok(REVIEWS.length >= 3);
  assert.equal(REVIEWS.filter((r) => r.lead).length, 1);
  for (const review of REVIEWS) {
    assert.equal(review.source, "Google");
    assert.ok(review.author.trim() && review.text.trim().length > 40);
    assert.match(review.text, /[.!?]$/, "an excerpt ends at a sentence boundary");
  }
  assert.match(GOOGLE_PROFILE_URL, /^https:\/\/maps\.google\.com\/maps\?cid=\d+$/);
  assert.match(GOOGLE_WRITE_REVIEW_URL, /^https:\/\/search\.google\.com\/local\/writereview\?placeid=/);
});

test("service-area map: every served town, at believable distances and bearings", () => {
  assert.deepEqual(MAP_TOWNS.map((t) => t.name), SERVED_COMMUNITIES);
  assert.equal(MAP_TOWNS.length, 12);
  assert.equal(HOME_BASE.name, config.site.location.city);
  for (const town of MAP_TOWNS) {
    const miles = milesFromBase(town);
    assert.ok(miles > 5 && miles < Math.max(...RING_MILES), `${town.name} is ${miles.toFixed(1)} mi out, inside the outer ring`);
    assert.ok(["left", "right"].includes(town.label));
    assert.match(town.slug, /^[a-z-]+-ga$/);
    assert.ok(config.serviceArea.summary.value.includes(town.name), `${town.name} is in the approved service-area fact`);
  }
  // Spot checks against the real map.
  const by = Object.fromEntries(MAP_TOWNS.map((t) => [t.name, offsetMiles(t)]));
  assert.ok(by.Dahlonega.east > 0 && by.Dahlonega.north > 0, "Dahlonega is northeast");
  assert.ok(by.Cleveland.east > 15 && by.Cleveland.north > 8, "Cleveland is farther northeast");
  assert.ok(by.Alpharetta.east < 0 && by.Alpharetta.north < -20, "Alpharetta is south-southwest");
  assert.ok(by.Jasper.east < -15 && Math.abs(by.Jasper.north) < 6, "Jasper is west");
  assert.ok(by.Atlanta.north < -40, "Atlanta is the far south end");
  const miles = (name) => milesFromBase(MAP_TOWNS.find((t) => t.name === name));
  assert.ok(Math.abs(miles("Cumming") - 14.7) < 1.5, "Cumming is about 15 miles south");
  assert.ok(Math.abs(miles("Atlanta") - 49) < 2, "Atlanta is about 49 miles");
  assert.equal(Math.max(...MAP_TOWNS.map((t) => milesFromBase(t))), miles("Atlanta"), "Atlanta is the farthest, as its page says");
  assert.deepEqual(nearestTowns(MAP_TOWNS.find((t) => t.name === "Roswell")).map((t) => t.name), ["Alpharetta", "Johns Creek", "Canton"]);
});

test("built homepage: living hero, triage, reviews, license, new number and both mobile actions", () => {
  ensureBuilt();
  const html = read("dist", "index.html");
  assert.match(html, /<h1 id="hero-title">Your Indoor Weather Experts<\/h1>/);
  assert.match(html, /role="slider"[^>]*aria-valuemin="60"[^>]*aria-valuemax="80"/);
  assert.match(html, /<canvas class="airflow" aria-hidden="true">/);
  assert.match(html, /This room is a demonstration, not your thermostat\./);
  assert.match(html, /What is your system doing\?/);
  assert.match(html, /href="\/urgent\/"[^>]*>No heat</);
  assert.match(html, /href="\/book-service\/\?issue=maintenance"/);
  for (const review of REVIEWS) {
    assert.ok(html.includes(escapeHtml(review.text)), `${review.author}'s review is quoted as written`);
    assert.ok(html.includes(`${review.author}, Google review`));
  }
  assert.ok(html.includes(GOOGLE_PROFILE_URL.replaceAll("&", "&amp;")));
  assert.equal(config.site.license.number, "23196912");
  assert.equal(html.match(/License no\. 23196912/g)?.length, 2, "license number in the reviews section and the footer");
  assert.match(html, /class="mobile-bar__call" href="tel:\+17065020877"/);
  assert.match(html, /class="mobile-bar__book" href="\/book-service\/"/);
  assert.doesNotMatch(html, /aggregateRating|reviewRating|ratingValue|out of 5|\d(\.\d)? stars?\b|five.star/i, "no rating figures are published");
  assert.doesNotMatch(html, /climate-precision-hero/, "the illustrative stock-style photo is no longer the hero");
  assert.match(html, /<svg[^>]*role="img"[^>]*aria-label="Map centered on Dawsonville with rings at 10, 25, 50 miles\./);
  assert.match(html, /class="closing__phone" href="tel:\+17065020877"/);
  assert.doesNotMatch(html, /Insured|Locally owned|family.owned/i, "no unconfirmed trust wording");
  assert.doesNotMatch(html, /Manrope/, "the retired display face is not referenced");
  assert.doesNotMatch(html, /p\.m\.\./, "no doubled period after the hours");
});
