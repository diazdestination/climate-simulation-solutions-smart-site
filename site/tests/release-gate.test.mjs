import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import config from "../site.config.mjs";
import { evaluateRelease } from "../scripts/release-gate.mjs";
import pub, { publicFactText, toPublicConfig } from "../src/lib/publicConfig.js";
import { HOURS_CONFIRMED, HOURS_FALLBACK, officeStatus } from "../src/lib/siteFacts.js";
import { root } from "./helpers.mjs";

const confirmedFixture = () => {
  const c = structuredClone(config);
  c.hours.summary = { value: "Monday–Friday, 8 a.m. to 4 p.m. (fixture)", approvedBy: "Fixture Owner", approvedOn: "2026-10-14" };
  c.site.origin = "https://csshvacga.com";
  c.site.releaseGates = c.site.releaseGates.map((g) => ({ ...g, status: "approved", approvedBy: "Fixture Owner", approvedOn: "2026-10-14", note: "approved" }));
  return c;
};
const gateCli = (env) =>
  spawnSync(process.execPath, [path.join(root, "scripts", "release-gate.mjs"), "--strict"], {
    cwd: root,
    encoding: "utf8",
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...env },
  });

test("hours conflict is recorded as [CONFIRM] in config, never guessed", () => {
  assert.match(config.hours.summary.value, /^\[CONFIRM: .*7–5.*9–5/);
  assert.equal(config.site.hoursSchedule, null);
});

test("the site renders the neutral fallback while hours are unconfirmed", () => {
  assert.equal(HOURS_CONFIRMED, false);
  assert.equal(HOURS_FALLBACK, "Call for current office hours");
  assert.doesNotMatch(pub.hours.text, /CONFIRM|7|9/);
  assert.equal(pub.hours.schedule, null);
  assert.equal(officeStatus(new Date("2026-10-14T15:00:00Z")), null, "no open/closed claim");
  assert.equal(publicFactText(config.hours.summary), config.hours.summary.display);
});

test("public config exposes no approver notes, gates or [CONFIRM] markers", () => {
  const text = JSON.stringify(toPublicConfig(config));
  assert.doesNotMatch(text, /CONFIRM|approvedBy|releaseGates|BUSINESS-PROOF/);
});

test("release gate: NOT publishable while hours (and other gates) are unconfirmed", async () => {
  const result = await evaluateRelease({ config, env: {} });
  assert.equal(result.publishable, false);
  assert.equal(result.allowed, false);
  assert.ok(result.items.some((i) => i.path === "hours.summary.value"));
  assert.ok(result.items.some((i) => i.path === "site.releaseGates.hours"));
});

test("release gate CLI --strict exits 1 without the flag and names the hours conflict", () => {
  const r = gateCli({});
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /NOT PUBLISHABLE/);
  assert.match(r.stderr, /7–5 per Oct 9 interview vs 9–5 per older docs/);
  assert.match(r.stderr, /Refusing to publish/);
});

test("release gate CLI allows a LOCAL build only with SITE_ALLOW_UNCONFIRMED_FACTS=true", () => {
  const r = gateCli({ SITE_ALLOW_UNCONFIRMED_FACTS: "true" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /local override in effect\. Do not deploy/);
  assert.equal(gateCli({ SITE_ALLOW_UNCONFIRMED_FACTS: "1" }).status, 1, "only the exact value true counts");
});

test("release gate passes once every fact and gate is confirmed", async () => {
  const result = await evaluateRelease({ config: confirmedFixture(), env: {} });
  assert.deepEqual(result.items, []);
  assert.equal(result.publishable, true);
  const c = confirmedFixture();
  c.site.hoursSchedule = { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], open: "08:00", close: "16:00" };
  const p = toPublicConfig(c);
  assert.equal(p.hours.confirmed, true);
  // 2026-10-14 is a Wednesday; 15:00Z = 11:00 America/New_York.
  assert.equal(officeStatus(new Date("2026-10-14T15:00:00Z"), p.hours.schedule, true), "office-open");
  assert.equal(officeStatus(new Date("2026-10-17T15:00:00Z"), p.hours.schedule, true), "office-closed");
});
