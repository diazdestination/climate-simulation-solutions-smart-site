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

test("hours are confirmed as Mon–Fri 7 a.m.–5 p.m. (CSS owners via Adam, 2026-10-14)", () => {
  assert.equal(config.hours.summary.value, "Monday–Friday, 7 a.m. to 5 p.m.");
  assert.equal(config.hours.summary.approvedOn, "2026-10-14");
  assert.deepEqual(config.site.hoursSchedule, { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], open: "07:00", close: "17:00" });
  assert.equal(config.site.releaseGates.find((g) => g.id === "hours").status, "approved");
});

test("the site shows the confirmed hours and an accurate open/closed state", () => {
  assert.equal(HOURS_CONFIRMED, true);
  assert.equal(pub.hours.text, "Monday–Friday, 7 a.m. to 5 p.m.");
  assert.equal(publicFactText(config.hours.summary), "Monday–Friday, 7 a.m. to 5 p.m.");
  assert.doesNotMatch(JSON.stringify(pub.hours), /CONFIRM|9 a\.m/);
  assert.equal(typeof HOURS_FALLBACK, "string");
  // 2026-10-14 is a Wednesday: 15:00Z = 11:00 EDT (open), 22:30Z = 18:30 EDT (closed); Oct 17 is a Saturday.
  assert.equal(officeStatus(new Date("2026-10-14T15:00:00Z")), "office-open");
  assert.equal(officeStatus(new Date("2026-10-14T10:30:00Z")), "office-closed", "6:30 a.m. is before opening");
  assert.equal(officeStatus(new Date("2026-10-14T22:30:00Z")), "office-closed");
  assert.equal(officeStatus(new Date("2026-10-17T15:00:00Z")), "office-closed");
});

test("public config exposes no approver notes, gates or [CONFIRM] markers", () => {
  const text = JSON.stringify(toPublicConfig(config));
  assert.doesNotMatch(text, /CONFIRM|approvedBy|releaseGates|BUSINESS-PROOF/);
});

test("release gate: NOT publishable while the domain and other gates are unconfirmed; hours no longer block", async () => {
  const result = await evaluateRelease({ config, env: {} });
  assert.equal(result.publishable, false);
  assert.equal(result.allowed, false);
  assert.ok(!result.items.some((i) => i.path === "hours.summary.value"));
  assert.ok(!result.items.some((i) => i.path === "site.releaseGates.hours"));
  assert.ok(result.items.some((i) => i.path === "site.releaseGates.production-origin"));
});

test("release gate CLI --strict exits 1 without the flag and names the domain gate", () => {
  const r = gateCli({});
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /NOT PUBLISHABLE/);
  assert.match(r.stderr, /Production domain not chosen yet/);
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
