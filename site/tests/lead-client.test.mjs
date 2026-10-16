import assert from "node:assert/strict";
import test from "node:test";
import { interpretLeadResponse, isLoopbackPreview } from "../src/lib/leadCapture.js";
import { buildLeadRequest } from "../src/lib/hvacRequest.js";
import { customer } from "./helpers.mjs";

test("a local-only 'prepared' state exists only on a loopback preview and never carries a reference", () => {
  const notConfigured = { code: "growthos_not_configured", ready: false };
  assert.deepEqual(interpretLeadResponse(503, notConfigured, { loopback: true }), { status: "prepared-locally" });
  const publicHost = interpretLeadResponse(503, notConfigured, { loopback: false });
  assert.equal(publicHost.status, "error");
  assert.equal(publicHost.reference, undefined);
  assert.equal(isLoopbackPreview("127.0.0.1"), true);
  assert.equal(isLoopbackPreview("csshvac.com"), false);
});

test("saved needs status saved + leadId + reference; queued/needs-review are honest pending states", () => {
  assert.equal(interpretLeadResponse(201, { status: "saved", leadId: "x", reference: "y" }).status, "saved");
  assert.equal(interpretLeadResponse(201, { status: "saved" }).status, "error");
  assert.equal(interpretLeadResponse(200, { status: "sent", reference: "y" }).status, "error");
  assert.deepEqual(interpretLeadResponse(202, { status: "sent", reference: "RQ-1" }), { status: "sent", reference: "RQ-1" });
  assert.equal(interpretLeadResponse(202, { status: "sent" }).status, "error", "no reference, no success");
  assert.equal(interpretLeadResponse(502, { code: "email_delivery_unavailable" }).status, "error");
  assert.deepEqual(interpretLeadResponse(202, { status: "queued", reference: "r" }), { status: "queued", reference: "r" });
  assert.deepEqual(interpretLeadResponse(202, { status: "needs-review", reference: "r" }), { status: "needs-review", reference: "r" });
  assert.equal(interpretLeadResponse(409, {}).code, "idempotency_conflict");
});

test("envelope carries tenant/source from config, requestId, and only whitelisted contact fields", () => {
  const env = buildLeadRequest("service", customer({ issue: "thermostat" }), { requestId: "bbbbbbbb-1111-4111-8111-aaaaaaaaaaaa" });
  assert.equal(env.tenantKey, "climate-simulation-solutions");
  assert.equal(env.source, "climate-simulation-solutions-website");
  assert.equal(env.formId, "service-request");
  assert.deepEqual(Object.keys(env.contact).sort(), ["email", "name", "phone"]);
  assert.equal(env.consent.analyticsAuthorized, false);
  assert.equal(env.project.timing, undefined, "browser never sets GrowthOS timing directly");
  assert.ok(env.project.summary.length < 2000);
});
