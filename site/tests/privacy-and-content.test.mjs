import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ensureBuilt, read, root, walkFiles } from "./helpers.mjs";
import { ROUTES } from "../src/routes.js";
import { previewNoindex } from "../scripts/release-gate.mjs";

const BANNED = /painless|roof|claim|adjuster|storm|444-4476|hail/gi;
// Justified third-party hits: the JWT library bundled inside the ElevenLabs/LiveKit SDK
// (lazy assistant chunk only) names JWT "claims". These are code identifiers, not site copy.
const ALLOWED_VENDOR = [/ERR_JWT_CLAIM_VALIDATION_FAILED/g, /\{claim:[a-z],/g, /"claim",void 0/g, /this\.claim=/g];
const TEXT = new Set([".html", ".js", ".css", ".txt", ".xml", ".json", ".svg"]);

test("privacy page: present, noindex, draft banner, [confirm] markers, real CSS data flows", () => {
  const html = read("public", "privacy", "index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /Draft — pending attorney review/);
  for (const marker of ["[confirm legal entity name]", "[mailing address]", "[confirm host", "[set a retention period with counsel]", "[confirm privacy contact email]"]) assert.ok(html.includes(marker), marker);
  assert.match(html, /MogulForge GrowthOS/);
  assert.match(html, /ElevenLabs \(AI voice and text assistant\) — only if you use the assistant/);
  assert.match(html, /We do not send text messages from this website/);
  assert.match(html, /Global Privacy Control and Do Not Track/);
  assert.match(html, /Optional measurement \(off unless you turn it on\)/);
  assert.doesNotMatch(html, /weather|NOAA|Census|Microsoft 365|insurance compan/i);
  assert.doesNotMatch(html, BANNED);
});

test("every consent point and the AI disclosure link to /privacy/", () => {
  const form = read("src", "components", "RequestForm.jsx");
  assert.match(form, /\{consentTextFor\(formId\)\} See our <a href="\/privacy\/"/);
  const desk = read("src", "components", "VoiceDesk.jsx");
  assert.match(desk, /You’ll be talking with an AI assistant, not a person\./);
  assert.match(desk, /disabled=\{!acknowledged \|\| !isReady/, "assistant cannot start before the AI disclosure is acknowledged");
  assert.equal((desk.match(/href="\/privacy\/"/g) ?? []).length, 2, "disclosure + file consent");
  assert.match(read("src", "components", "MeasurementChoices.jsx"), /href="\/privacy\/"/);
});

test("built output: every route prerendered, indexable on csshvac.com, privacy copied as a noindex labeled draft", () => {
  ensureBuilt();
  for (const route of ROUTES) {
    const file = route.path === "/" ? path.join(root, "dist", "index.html") : path.join(root, "dist", ...route.path.split("/").filter(Boolean), "index.html");
    assert.ok(existsSync(file), route.path);
    const html = readFileSync(file, "utf8");
    assert.ok(html.includes(`<title>${route.title.replaceAll("&", "&amp;")}</title>`), `${route.path} title`);
    const expected = route.noindex ? /<meta name="robots" content="noindex,nofollow">/ : /<meta name="robots" content="index,follow,max-image-preview:large">/;
    assert.match(html, expected, `${route.path} robots`);
    assert.match(html, /<div id="root">(<link [^>]+>)*<div class="site">/, `${route.path} prerendered`);
  }
  assert.match(read("dist", "robots.txt"), /Allow: \/\n\nSitemap: https:\/\/csshvac\.com\/sitemap\.xml/);
  const sitemap = read("dist", "sitemap.xml");
  assert.doesNotMatch(sitemap, /privacy/, "the draft policy is not in the sitemap");
  const privacy = read("dist", "privacy", "index.html");
  assert.match(privacy, /Draft — pending attorney review/);
  assert.match(privacy, /<meta name="robots" content="noindex">/);
  assert.match(read("dist", "index.html"), /Monday–Friday, 7 a.m. to 5 p.m./, "confirmed hours are published");
  assert.doesNotMatch(read("dist", "index.html"), /9 a.m.|9–5|CONFIRM/);
  assert.doesNotMatch(read("dist", "index.html"), /9am|9:00|7am|7:00|Mon–Fri, 9|seven to five/i, "no guessed hours");
});

test("a preview host stays noindex even though the release gate passes", () => {
  assert.equal(previewNoindex("https://css-preview.example.workers.dev", {}), true);
  assert.equal(previewNoindex("https://csshvac.com", { SITE_NOINDEX: "true" }), true);
  assert.equal(previewNoindex("https://csshvac.com", {}), false);
  assert.match(read("scripts", "build.mjs"), /const blocked = !gate\.publishable \|\| previewHost;/);
});

test("content guard: no Painless/roofing/claims/storm/hail strings or [CONFIRM] notes in the built site", () => {
  ensureBuilt();
  const hits = [];
  for (const file of walkFiles(path.join(root, "dist"))) {
    if (!TEXT.has(path.extname(file))) continue;
    let text = readFileSync(file, "utf8");
    const rel = path.relative(root, file);
    if (/[\\/]VoiceDesk-[^\\/]+\.js$/.test(rel)) for (const allowed of ALLOWED_VENDOR) text = text.replace(allowed, "");
    for (const m of text.matchAll(BANNED)) hits.push(`${rel}: …${text.slice(Math.max(0, m.index - 30), m.index + 30)}…`);
    if (/\[CONFIRM/.test(text)) hits.push(`${rel}: [CONFIRM marker`);
    if (/approvedBy|releaseGates|BUSINESS-PROOF/.test(text)) hits.push(`${rel}: internal config notes`);
  }
  assert.deepEqual(hits, []);
});

test("source guard: no Painless identity, phone, tenant or roofing copy in site sources", () => {
  const files = walkFiles(path.join(root, "src")).concat(walkFiles(path.join(root, "agent")), [path.join(root, "site.config.mjs"), path.join(root, "index.html")]);
  const hits = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/painless|roof|adjuster|storm|444-4476|hail/gi)) hits.push(`${path.relative(root, file)}: ${m[0]}`);
  }
  assert.deepEqual(hits, []);
});
