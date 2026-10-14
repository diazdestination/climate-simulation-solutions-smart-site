import assert from "node:assert/strict";
import test from "node:test";
import { validateSiteConfig, GROWTHOS_PROFILES } from "../core/config/schema.mjs";
import config from "../site.config.mjs";
import { read } from "./helpers.mjs";

// wrangler.jsonc uses only full-line // comments (block-comment stripping would eat "/api/*").
const stripJsonc = (text) => text.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1");

test("site.config.mjs passes the core schema", () => {
  const { ok, errors } = validateSiteConfig(config);
  assert.deepEqual(errors, []);
  assert.equal(ok, true);
});

test("GrowthOS is connected by default on the hvac profile; email only in pre-GrowthOS mode; SMS off", () => {
  assert.equal(config.growthos.enabled, true);
  assert.equal(config.growthos.profile, "hvac");
  for (const code of config.growthos.serviceCodes) assert.ok(GROWTHOS_PROFILES.hvac.includes(code), code);
  assert.deepEqual(config.emailBridge, { enabled: true, preGrowthOS: true });
  assert.doesNotMatch(JSON.stringify(config), /@(?!example\.)[a-z0-9-]+\.[a-z]{2,}/i, "no real email addresses in config");
  assert.equal(config.sms.compliantConsentApproved, false);
  assert.equal(config.growthos.requireOriginHeader, true);
});

test("every form offers phone + email consent only (no SMS) and states it is not a booking", () => {
  assert.deepEqual(Object.keys(config.growthos.forms).sort(), ["estimate-question", "maintenance-plan", "service-request", "urgent-request"]);
  for (const [id, form] of Object.entries(config.growthos.forms)) {
    assert.deepEqual(form.channels, ["phone", "email"], id);
    assert.doesNotMatch(form.consentText, /\btext me\b|\bSMS\b/i, id);
    assert.match(form.consentText, /does not send text messages/, id);
  }
  assert.match(config.growthos.forms["service-request"].consentText, /office confirms any appointment/);
  assert.match(config.growthos.forms["urgent-request"].consentText, /does not dispatch a technician or confirm an arrival time/);
});

test("urgent form vocabulary maps every issue to GrowthOS timing 'urgent'", () => {
  const map = config.growthos.timingMap["urgent-request"];
  for (const issue of ["no-heat", "no-cooling", "water-leak", "noise-and-failure", "other-urgent"]) assert.equal(map[issue], "urgent", issue);
});

test("voice is private and limited to the three registry tools", () => {
  assert.equal(config.voice.public, false);
  assert.deepEqual(config.voice.agent.tools, ["sync_case", "show_call_path", "open_written_request"]);
  assert.equal(config.voice.agent.privacy.recordVoice, false);
  assert.equal(config.modules.weatherHail.enabled, false);
});

test("no owner direct contacts or invented claims in config", () => {
  const text = JSON.stringify(config);
  assert.doesNotMatch(text, /@(?!example)[a-z0-9-]+\.[a-z]/i, "no email addresses");
  const phones = text.match(/\+1\d{10}/g) ?? [];
  assert.deepEqual([...new Set(phones)], ["+17068095076"], "only the public business line");
  assert.equal(config.site.maintenancePlans.pricing, null, "plan pricing not approved");
});

test("wrangler.jsonc: D1 DB binding, cron drain, /api/* worker-first, no workers.dev, no routes, no account ids", () => {
  const raw = read("wrangler.jsonc");
  const w = JSON.parse(stripJsonc(raw));
  assert.equal(w.name, "climate-simulation-solutions-site");
  assert.equal(w.main, "./worker/index.js");
  assert.equal(w.workers_dev, false);
  assert.equal(w.preview_urls, false);
  assert.deepEqual(w.assets.run_worker_first, ["/api/*"]);
  assert.equal(w.assets.directory, "./dist");
  assert.equal(w.d1_databases[0].binding, "DB");
  assert.equal(w.d1_databases[0].database_id, "00000000-0000-0000-0000-000000000000");
  assert.deepEqual(w.triggers.crons, ["*/5 * * * *"]);
  assert.equal(w.routes, undefined);
  assert.equal(w.route, undefined);
  assert.equal(w.account_id, undefined);
  // Pre-GrowthOS launch: email to owners until Codex connects GrowthOS and sets this to "true".
  assert.equal(w.vars.SMART_SITE_GROWTHOS_ENABLED, "false");
  assert.equal(w.vars.SITE_EMAIL_ENABLED, "true");
  assert.equal(w.vars.SITE_EMAIL_PROVIDER, "resend");
  assert.equal(w.vars.SITE_EMAIL_SENDER_NAME, "MogulForge Lead Alerts");
  for (const secret of ["SITE_EMAIL_SENDER", "SITE_EMAIL_INTERNAL_RECIPIENTS", "RESEND_API_KEY", "MICROSOFT_CLIENT_SECRET"]) assert.equal(w.vars[secret], undefined, secret);
  assert.equal(w.vars.ELEVENLABS_VOICE_PUBLIC, "false");
  assert.equal(w.vars.SITE_ALLOW_UNCONFIRMED_FACTS, undefined);
  for (const secret of ["GROWTHOS_SITE_ID", "GROWTHOS_SITE_SECRET", "ELEVENLABS_API_KEY", "SITE_OUTBOX_ENCRYPTION_KEY"]) assert.equal(w.vars[secret], undefined, secret);
});

test(".env.example enables GrowthOS with ID/secret unset and never sets the local override", () => {
  const env = read(".env.example");
  assert.match(env, /^SMART_SITE_GROWTHOS_ENABLED=true$/m);
  assert.match(env, /^GROWTHOS_SITE_ID=$/m);
  assert.match(env, /^GROWTHOS_SITE_SECRET=$/m);
  assert.match(env, /^ELEVENLABS_VOICE_PUBLIC=false$/m);
  assert.doesNotMatch(env, /^SITE_ALLOW_UNCONFIRMED_FACTS=/m);
  assert.doesNotMatch(env, /^#?s*[A-Z_]*(SMS|TWILIO)[A-Z_]*=/m, "no SMS provider variables");
});
