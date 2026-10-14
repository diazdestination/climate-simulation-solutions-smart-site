import assert from "node:assert/strict";
import test from "node:test";
import config from "../site.config.mjs";
import { createSmartSiteWorker } from "../core/worker/router.js";
import { buildLeadRequest } from "../src/lib/hvacRequest.js";
import { PUBLIC_ORIGIN, customer, growthosStub, postLead, prodEnv, siteId } from "./helpers.mjs";

const requestId = () => crypto.randomUUID();
const INTAKE = `https://app.mogulforge.ai/api/v1/public/smart-sites/${siteId}/intake`;

async function send(kind, fields, env = prodEnv()) {
  const { calls, fetchImpl } = growthosStub();
  const worker = createSmartSiteWorker(config, { fetchImpl });
  const response = await worker.fetch(postLead(buildLeadRequest(kind, fields, { requestId: requestId() })), env);
  return { response, body: await response.json(), calls };
}

for (const issue of ["no-heat", "no-cooling", "water-leak"]) {
  test(`urgent ${issue} -> GrowthOS intake with timing "urgent", service repair and a structured summary`, async () => {
    const { response, body, calls } = await send("urgent", customer({ issue, systemType: "heat-pump", systemAge: "10-15", brand: "ExampleBrand", notes: "Started this morning." }));
    assert.equal(response.status, 201);
    assert.equal(body.status, "saved");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, INTAKE);
    const sent = calls[0].body;
    assert.equal(sent.project.timing, "urgent");
    assert.equal(sent.project.serviceCode, "repair");
    assert.equal(sent.consent.policyVersion, config.growthos.forms["urgent-request"].policyVersion);
    assert.match(sent.project.summary, /^\[CSS website\] URGENT request/);
    assert.match(sent.project.summary, /\nIssue: (No heat|No AC \/ no cooling|Water leaking from the system)\n/);
    assert.match(sent.project.summary, /\nSystem type: Heat pump\n/);
    assert.match(sent.project.summary, /\nApprox\. system age: 10–15 years\n/);
    assert.match(sent.project.summary, /\nBrand: ExampleBrand\n/);
    assert.match(sent.project.summary, /No arrival time was promised/);
    assert.equal(sent.project.address, "100 Example Test Way");
    assert.equal(sent.project.city, "Dawsonville");
    assert.equal(sent.project.state, "GA");
    assert.equal(sent.project.postalCode, "30534");
  });
}

test("schedule (book service) request: office-confirmed wording, preferred times as a request, timing from vocabulary", async () => {
  const { body, calls } = await send("service", customer({ issue: "maintenance", timing: "this-week", preferredWindows: ["weekday-morning", "first-available"], preferredDate: "Tuesday", systemType: "central-ac-furnace" }));
  assert.equal(body.status, "saved");
  const sent = calls[0].body;
  assert.equal(sent.project.serviceCode, "maintenance");
  assert.equal(sent.project.timing, "soon");
  assert.match(sent.project.summary, /Request type: Book a service call \(request only; office confirms\)/);
  assert.match(sent.project.summary, /Preferred times \(request, not confirmed\): Weekday morning, First available; around Tuesday/);
});

test("service request urgency defaults to 'unsure'", async () => {
  const { calls } = await send("service", customer({ issue: "replacement" }));
  assert.equal(calls[0].body.project.serviceCode, "replacement");
  assert.equal(calls[0].body.project.timing, "unsure");
});

test("maintenance plan request -> service maintenance, timing planning, plan interest in summary", async () => {
  const residential = await send("maintenance", customer({ propertyType: "residential", systemCount: "2" }));
  let sent = residential.calls[0].body;
  assert.equal(sent.project.serviceCode, "maintenance");
  assert.equal(sent.project.timing, "planning");
  assert.match(sent.project.summary, /Plan interest: Residential plan — visit every six months, billed annually/);
  assert.match(sent.project.summary, /Number of systems: 2/);
  const commercial = await send("maintenance", customer({ propertyType: "commercial" }));
  sent = commercial.calls[0].body;
  assert.match(sent.project.summary, /Plan interest: Commercial plan — quarterly visits, billed annually/);
});

test("estimate question -> service code from the estimate topic, never accepts the estimate", async () => {
  const { calls } = await send("estimate", customer({ estimateTopic: "replacement", questionType: "options", timing: "ready-to-talk", estimateReference: "EST-1001", notes: "Can we compare two options?" }));
  const sent = calls[0].body;
  assert.equal(sent.project.serviceCode, "replacement");
  assert.equal(sent.project.timing, "soon");
  assert.match(sent.project.summary, /does not accept or change the estimate/);
  assert.match(sent.project.summary, /Estimate reference \(if known\): EST-1001/);
  const unknown = await send("estimate", customer({ estimateTopic: "bogus" }));
  assert.equal(unknown.calls[0].body.project.serviceCode, "not-sure");
  assert.equal(unknown.calls[0].body.project.timing, "unsure");
});

test("consent channels are phone + email, or phone only without an email; never sms", async () => {
  const withEmail = await send("service", customer());
  assert.deepEqual(withEmail.calls[0].body.consent.channels, ["phone", "email"]);
  const noEmail = await send("urgent", customer({ email: "", issue: "no-heat" }));
  assert.deepEqual(noEmail.calls[0].body.consent.channels, ["phone"]);
  for (const r of [withEmail, noEmail]) assert.ok(!r.calls[0].body.consent.channels.includes("sms"));
});

test("browser cannot smuggle sms consent or a different tenant", async () => {
  const { calls, fetchImpl } = growthosStub();
  const worker = createSmartSiteWorker(config, { fetchImpl });
  const envelope = buildLeadRequest("service", customer(), { requestId: requestId() });
  envelope.consent.channels = ["sms"];
  envelope.project.timing = undefined;
  let r = await worker.fetch(postLead(envelope), prodEnv());
  assert.equal(r.status, 201);
  assert.deepEqual(calls[0].body.consent.channels, ["phone", "email"]);
  r = await worker.fetch(postLead({ ...envelope, tenantKey: "someone-else" }), prodEnv());
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, "lead_source_invalid");
});

test("fails closed: 503 without GrowthOS credentials, 403 without an Origin header, 400 without consent", async () => {
  const { calls, fetchImpl } = growthosStub();
  const worker = createSmartSiteWorker(config, { fetchImpl });
  const env = prodEnv({ GROWTHOS_SITE_SECRET: "" });
  let r = await worker.fetch(postLead(buildLeadRequest("urgent", customer({ issue: "no-heat" }), { requestId: requestId() })), env);
  assert.equal(r.status, 503);
  assert.equal((await r.json()).code, "growthos_not_configured");
  r = await worker.fetch(postLead(buildLeadRequest("service", customer(), { requestId: requestId() }), { origin: null }), prodEnv());
  assert.equal(r.status, 403);
  r = await worker.fetch(postLead(buildLeadRequest("service", customer({ consent: false }), { requestId: requestId() })), prodEnv());
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, "contact_consent_required");
  assert.equal(calls.length, 0);
});

test("GET /api/lead never exposes credentials; voice endpoints stay private off loopback", async () => {
  const worker = createSmartSiteWorker(config, { fetchImpl: async () => new Response("{}") });
  const status = await (await worker.fetch(new Request(`${PUBLIC_ORIGIN}/api/lead`), prodEnv())).json();
  assert.equal(status.ready, true);
  assert.doesNotMatch(JSON.stringify(status), /ss_|eeeeeeee/);
  assert.deepEqual(status.forms["urgent-request"].channels, ["phone", "email"]);
  const voice = await worker.fetch(new Request(`${PUBLIC_ORIGIN}/api/elevenlabs/token`), { ELEVENLABS_API_KEY: "test-key", ELEVENLABS_AGENT_ID: "agent_test", ELEVENLABS_VOICE_PUBLIC: "true" });
  assert.equal(voice.status, 403);
  assert.equal((await worker.fetch(new Request(`${PUBLIC_ORIGIN}/api/weather/evidence`), {})).status, 404);
});

test("the Cloudflare entry (worker/index.js) routes through the abuse-guard hook to the core", async (t) => {
  const { calls, fetchImpl } = growthosStub();
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  t.after(() => (globalThis.fetch = original));
  const entry = (await import("../worker/index.js")).default;
  assert.equal(typeof entry.scheduled, "function");
  const r = await entry.fetch(postLead(buildLeadRequest("urgent", customer({ issue: "water-leak" }), { requestId: requestId() })), prodEnv(), {});
  assert.equal(r.status, 201);
  assert.equal(calls[0].body.project.timing, "urgent");
  assert.deepEqual(await entry.scheduled({}, {}, {}), { skipped: "outbox_not_configured" });
});
