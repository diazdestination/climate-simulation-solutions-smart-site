// The interface rules recorded in DECISIONS.md (2026-11-11, "Buttons, cards and forms"): three
// radii, keys instead of gradient buttons, one set of actions per phone screen, two-tier triage,
// plan cards that lead with a figure, and forms without leftover template dressing.
import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import config from "../site.config.mjs";
import { ensureBuilt, read, root } from "./helpers.mjs";
import { SEASONS, triageFor } from "../src/lib/season.js";
import { visitsAYear } from "../src/lib/siteFacts.js";

const css = Object.fromEntries(["styles.css", "smart-site.css", "home.css", "areas.css"].map((file) => [file, read("src", file)]));
const all = Object.values(css).join("\n");
// These stylesheets keep one rule to a line, so a line is a rule.
const rules = all.split("\n").filter((line) => line.includes("{"));

const builtPages = () => {
  ensureBuilt();
  const pages = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === "index.html") pages.push(path.relative(path.join(root, "dist"), full));
    }
  };
  walk(path.join(root, "dist"));
  return pages;
};

test("shape: every corner is a control, a surface, round or square", () => {
  assert.match(css["styles.css"], /--r-control: 10px;/);
  assert.match(css["styles.css"], /--r-surface: 14px;/);
  const radii = [...all.matchAll(/border-radius:\s*([^;}]+)/g)].map((match) => match[1].trim());
  assert.ok(radii.length > 30, "the stylesheets were read");
  for (const radius of radii) assert.ok(["var(--r-control)", "var(--r-surface)", "50%", "0"].includes(radius), `unexpected radius: ${radius}`);
});

test("keys: solid plates with one shared press, no gradient, glass or glow", () => {
  const pressable = /\.(button|mobile-bar|triage-tile|issue-card|toggle-key|voice-mode-card|voice-composer|icon-button|menu-toggle|nav-assistant|measurement-trigger|thermostat-steps)\b/;
  const keyRules = rules.filter((line) => pressable.test(line.split("{")[0]));
  assert.ok(keyRules.length > 40);
  for (const line of keyRules) {
    assert.doesNotMatch(line, /gradient\(/, `no gradient on a key: ${line.trim().slice(0, 80)}`);
    assert.doesNotMatch(line, /backdrop-filter/, `no glass on a key: ${line.trim().slice(0, 80)}`);
  }
  assert.match(css["styles.css"], /\.button-primary \{ background: var\(--amber\); color: var\(--brand-navy\); box-shadow: var\(--key-edge-amber\); \}/);
  const press = css["styles.css"].match(/:where\(([^)]+)\):active:not\(:disabled\) \{ transform: translateY\(2px\); box-shadow: var\(--key-ring\); \}/);
  assert.ok(press, "one press rule");
  for (const key of [".button", ".mobile-bar a", ".triage-tile", ".issue-card", ".toggle-key", ".voice-mode-card", ".icon-button", ".menu-toggle", ".thermostat-steps button"]) {
    assert.ok(press[1].split(", ").includes(key), `${key} drops when pressed`);
  }
  // iOS only paints :active while the page has a touch listener.
  assert.match(read("src", "main.jsx"), /document\.addEventListener\("touchstart", \(\) => \{\}, \{ passive: true \}\);/);
  // One drop shadow, and only on things that float over the page.
  const shadows = [...all.matchAll(/box-shadow:\s*([^;}]+)/g)].map((match) => match[1]);
  assert.deepEqual(shadows.filter((value) => /(^|,\s*)0 \d+px \d+px/.test(value)), [], "no hand-written drop shadows");
  const floating = rules.filter((line) => line.includes("var(--float)") && !line.trim().startsWith("--")).map((line) => line.trim().split(" {")[0]);
  assert.deepEqual(floating.sort(), [".measurement-banner", ".measurement-panel", ".site-nav", ".voice-desk"]);
});

test("labels: nothing is set in tracked capitals", () => {
  assert.doesNotMatch(all, /text-transform:\s*uppercase/);
  assert.doesNotMatch(all, /letter-spacing:\s*(\.\d|[1-9])/, "no positive tracking");
});

test("phones: what the docked bar offers is not repeated in the page", () => {
  const phone = css["home.css"].slice(css["home.css"].indexOf("@media (max-width: 560px)"));
  assert.match(phone, /\.in-mobile-bar \{ display: none !important; \}/);
  assert.match(phone, /\.mobile-bar \{ position: fixed; z-index: 20; left: 0; right: 0; bottom: 0;/);
  assert.doesNotMatch(css["home.css"].slice(0, css["home.css"].indexOf("@media (max-width: 980px)")), /\.in-mobile-bar/, "desktop keeps every button");

  const pages = builtPages();
  assert.ok(pages.length >= 25);
  for (const page of pages.filter((p) => p !== path.join("privacy", "index.html"))) {
    const html = read("dist", page);
    // Drop whole groups that are left out on phones, then look for a stray Call button.
    const rest = html.replace(/<div class="[^"]*\bin-mobile-bar\b[^"]*">.*?<\/div>/gs, "");
    const stray = [...rest.matchAll(/<a class="(button[^"]*)" href="tel:/g)].map((match) => match[1]).filter((cls) => !/\bin-mobile-bar\b/.test(cls));
    assert.deepEqual(stray, [], `${page}: a Call button repeats the docked bar`);
    const strayBook = [...rest.matchAll(/<a class="(button[^"]*)" href="\/book-service\/"/g)].map((match) => match[1]).filter((cls) => !/\bin-mobile-bar\b/.test(cls));
    assert.deepEqual(strayBook, [], `${page}: a Book service button repeats the docked bar`);
    assert.match(html, /<div class="mobile-bar[^"]*"><a class="mobile-bar__call[^"]*" href="tel:\+17065020877"/);
  }
  assert.match(read("dist", "index.html"), /<div class="climate-hero__actions in-mobile-bar">/);
  // The booking page is the form and the urgent page is the urgent path: the bar is Call alone.
  assert.match(read("dist", "book-service", "index.html"), /<div class="mobile-bar mobile-bar--single"><a class="mobile-bar__call" /);
  const urgent = read("dist", "urgent", "index.html");
  assert.match(urgent, /<div class="mobile-bar mobile-bar--single"><a class="mobile-bar__call mobile-bar__call--main" /);
  assert.doesNotMatch(urgent, /mobile-bar__book/);
  // A service page keeps the one action the bar does not have.
  assert.match(read("dist", "services", "emergency-hvac-repair", "index.html"), /<div class="hero-actions"><a class="button button-primary" href="\/urgent\/">Get urgent help<\/a>/);
});

test("homepage triage: three toned keys for what cannot wait, plain rows for the rest", () => {
  for (const season of Object.keys(SEASONS)) {
    const items = triageFor(season);
    const urgent = items.filter((item) => item.urgent);
    assert.deepEqual(urgent.map((item) => item.tone).sort(), ["cool", "warm", "water"]);
    assert.ok(items.slice(0, urgent.length).every((item) => item.urgent), "urgent choices come first");
    assert.ok(items.filter((item) => !item.urgent).every((item) => !item.tone && !item.href.startsWith("/urgent/")));
  }
  ensureBuilt();
  const html = read("dist", "index.html");
  assert.equal(html.match(/<a class="triage-tile tone-(warm|cool|water)" href="\/urgent\/"/g)?.length, 3);
  assert.match(html, /<p class="triage-bar__label" id="triage-urgent">Needs attention now<\/p>/);
  assert.match(html, /<p class="triage-bar__label" id="triage-planned">Planning ahead<\/p><ul class="link-rows link-rows--pairs" aria-labelledby="triage-planned">(<li><a href="[^"]+"[^>]*>[^<]+<\/a><\/li>){4}<\/ul>/);
  for (const tone of ["warm", "cool", "water"]) assert.match(css["styles.css"], new RegExp(`\\.tone-${tone} \\{ --tone: var\\(--${tone}\\); \\}`));
});

test("plan cards lead with a figure worked out from the approved cadence", () => {
  const plans = config.site.maintenancePlans;
  assert.equal(visitsAYear(plans.residential.cadence), 2, "update VISITS_A_YEAR in siteFacts.js if the residential cadence changed");
  assert.equal(visitsAYear(plans.commercial.cadence), 4, "update VISITS_A_YEAR in siteFacts.js if the commercial cadence changed");
  assert.equal(visitsAYear("Some cadence nobody approved"), null, "an unknown cadence shows no figure");
  ensureBuilt();
  const html = read("dist", "maintenance-plans", "index.html");
  assert.match(html, /<article class="plan-card tone-warm"><h2>Residential<\/h2><p class="plan-card__figure"><b>2<\/b> <span>visits a year<\/span><\/p><p class="plan-card__cadence">One visit every six months<\/p>/);
  assert.match(html, /<article class="plan-card tone-cool"><h2>Commercial<\/h2><p class="plan-card__figure"><b>4<\/b> <span>visits a year<\/span><\/p><p class="plan-card__cadence">Quarterly visits<\/p>/);
  assert.equal(html.match(/Pricing provided by the office\./g)?.length, 2, "no price is shown");
});

test("urgent page: issue keys are real buttons, locked ones stay readable, choices are real radios", () => {
  ensureBuilt();
  const html = read("dist", "urgent", "index.html");
  assert.equal(html.match(/<li><button type="button" class="issue-card[^"]*" aria-pressed="false" disabled="">/g)?.length, 5, "locked until the safety questions are answered");
  assert.doesNotMatch(html, /role="listitem"/, "a button keeps its button role");
  assert.equal(html.match(/<label class="toggle-key"><input type="radio" name="safety-(gas|electrical)"\/>/g)?.length, 4);
  assert.match(html, /Answer both safety questions to continue\./);
  assert.match(css["smart-site.css"], /\.issue-card:disabled \{[^}]*background: none;[^}]*\}/);
  for (const line of rules.filter((rule) => /\.issue-(card|grid)|\.triage-step/.test(rule.split("{")[0]))) assert.doesNotMatch(line, /opacity/, "locked keys are not faded out");
});

test("forms: wells, toggle keys with real inputs, and a submit button without an arrow", () => {
  assert.doesNotMatch(read("src", "components", "RequestForm.jsx"), /FaArrow/);
  ensureBuilt();
  const html = read("dist", "book-service", "index.html");
  assert.ok(html.match(/<span class="select-well"><select/g)?.length >= 4, "selects carry the site's own arrow");
  assert.equal(html.match(/<label class="toggle-key"><input type="checkbox"\/><span class="toggle-key__mark" aria-hidden="true"><\/span>/g)?.length, 4, "preferred times are checkboxes");
  assert.match(html, /<button class="button button-primary" type="submit"[^>]*>Send service request<\/button>/);
  assert.match(css["smart-site.css"], /\.toggle-key input \{ position: absolute; opacity: 0; pointer-events: none; \}/, "hidden from view, still focusable");
  assert.match(css["smart-site.css"], /\.toggle-key:focus-within \{ outline: 3px solid var\(--cyan\);/);
  assert.match(css["smart-site.css"], /\.request-form input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)[^{]*\{[^}]*border-radius: var\(--r-control\); background: var\(--well\);/);
});

test("related links are plain rows, not empty boxes", () => {
  ensureBuilt();
  const service = read("dist", "services", "emergency-hvac-repair", "index.html");
  assert.match(service, /<h2 class="related__title" id="related-title">Other services<\/h2><ul class="link-rows link-rows--columns">(<li><a href="\/services\/[a-z-]+\/">[^<]+<\/a><\/li>){4}<\/ul>/);
  const town = read("dist", "service-areas", "cumming-ga", "index.html");
  assert.match(town, /<h2 class="related__title" id="area-nearby-title">Nearby communities we serve<\/h2><ul class="link-rows link-rows--columns">/);
  assert.match(town, /<li><a href="\/service-areas\/">All service areas<\/a><\/li><\/ul>/);
  assert.doesNotMatch(service + town, /related-card|related-grid/);
});
