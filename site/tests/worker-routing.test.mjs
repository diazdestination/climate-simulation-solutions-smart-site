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
  let r = await worker.fetch(postLead(buildLeadRequest("urgent", customer({ issue: "no-heat" }), { requestId: requestId() })), {});
  assert.equal(r.status, 503, "no GrowthOS flag and no email settings: visible failure");
  r = await worker.fetch(postLead(buildLeadRequest("urgent", customer({ issue: "no-heat" }), { requestId: requestId() })), env);
  assert.equal(r.status, 503);
  assert.equal((await r.json()).code, "growthos_not_configured");
  r = await worker.fetch(postLead(buildLeadRequest("service", customer(), { requestId: requestId() }), { origin: null }), prodEnv());
  assert.equal(r.status, 403);
  r = await worker.fetch(postLead(buildLeadRequest("service", customer({ consent: false }), { requestId: requestId() })), prodEnv());
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, "contact_consent_required");
  assert.equal(calls.length, 0);
});

// Synthetic Graph settings; real owner addresses live only in Codex-managed secrets.
const emailEnv = {
  SITE_EMAIL_ENABLED: "true",
  SITE_EMAIL_SENDER: "office@example.test",
  SITE_EMAIL_INTERNAL_RECIPIENTS: "owner-one@example.test,owner-two@example.test",
  MICROSOFT_TENANT_ID: "tenant",
  MICROSOFT_CLIENT_ID: "client",
  MICROSOFT_CLIENT_SECRET: "server-secret",
};
function graphStub({ mailStatus = 202 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), body: init?.body && typeof init.body === "string" ? init.body : null });
    if (String(url).includes("microsoftonline")) return Response.json({ access_token: "short-lived" });
    if (String(url).includes("graph.microsoft.com")) return new Response(null, { status: mailStatus });
    return Response.json({ status: "saved", leadId: "dddddddd-1111-4111-8111-aaaaaaaaaaaa", receiptId: "cccccccc-1111-4111-8111-aaaaaaaaaaaa" }, { status: 201 });
  };
  return { calls, fetchImpl };
}

test("pre-GrowthOS: without the GrowthOS flag, an urgent request is emailed to the owners (no GrowthOS call)", async () => {
  const { calls, fetchImpl } = graphStub();
  const worker = createSmartSiteWorker(config, { fetchImpl });
  const id = requestId();
  const r = await worker.fetch(postLead(buildLeadRequest("urgent", customer({ issue: "no-heat" }), { requestId: id })), emailEnv);
  assert.equal(r.status, 202);
  const body = await r.json();
  assert.equal(body.status, "sent");
  assert.equal(body.reference, `RQ-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`);
  const mail = calls.find((c) => c.url.includes("/sendMail"));
  const message = JSON.parse(mail.body).message;
  assert.deepEqual(message.toRecipients.map((t) => t.emailAddress.address), ["owner-one@example.test", "owner-two@example.test"]);
  assert.match(message.body.content, /Form: urgent-request/);
  assert.match(message.body.content, /Timing: urgent/);
  assert.match(message.body.content, /100 Example Test Way, Dawsonville, GA/);
  assert.match(message.body.content, /consent css-urgent-request-v1: phone, email/);
  assert.equal(calls.some((c) => c.url.includes("smart-sites")), false);
});

test("pre-GrowthOS via Resend (the configured sender): one alert to the owners, retry-safe key", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    return String(url) === "https://api.resend.com/emails" ? Response.json({ id: "email-1" }) : new Response(null, { status: 500 });
  };
  const worker = createSmartSiteWorker(config, { fetchImpl });
  const id = requestId();
  const resendEnv = {
    SITE_EMAIL_ENABLED: "true",
    SITE_EMAIL_PROVIDER: "resend",
    SITE_EMAIL_SENDER_NAME: "MogulForge Lead Alerts",
    SITE_EMAIL_SENDER: "alerts@example.test",
    SITE_EMAIL_INTERNAL_RECIPIENTS: "owner-one@example.test,owner-two@example.test",
    RESEND_API_KEY: "re_test_0123456789abcdef",
  };
  const r = await worker.fetch(postLead(buildLeadRequest("service", customer(), { requestId: id })), resendEnv);
  assert.equal(r.status, 202);
  assert.equal((await r.json()).status, "sent");
  assert.equal(calls.length, 1);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.from, "MogulForge Lead Alerts <alerts@example.test>");
  assert.deepEqual(body.to, ["owner-one@example.test", "owner-two@example.test"]);
  assert.equal(calls[0].init.headers["idempotency-key"], `smart-site-lead-${id}`);
  assert.match(body.text, /Form: service-request/);
});

test("pre-GrowthOS: once SMART_SITE_GROWTHOS_ENABLED is on, leads go to GrowthOS and no email is sent", async () => {
  const { calls, fetchImpl } = graphStub();
  const worker = createSmartSiteWorker(config, { fetchImpl });
  const r = await worker.fetch(postLead(buildLeadRequest("service", customer(), { requestId: requestId() })), prodEnv(emailEnv));
  assert.equal(r.status, 201);
  assert.equal(calls.some((c) => c.url.includes("microsoft")), false);
  // Flag on but site secret missing: fails closed to the phone path; still no email.
  calls.length = 0;
  const half = await worker.fetch(postLead(buildLeadRequest("service", customer(), { requestId: requestId() })), prodEnv({ ...emailEnv, GROWTHOS_SITE_SECRET: "" }));
  assert.equal(half.status, 503);
  assert.equal(calls.length, 0);
});

test("pre-GrowthOS: an email failure is a visible error (phone fallback), never 'received'", async () => {
  const { fetchImpl } = graphStub({ mailStatus: 500 });
  const worker = createSmartSiteWorker(config, { fetchImpl });
  const r = await worker.fetch(postLead(buildLeadRequest("service", customer(), { requestId: requestId() })), emailEnv);
  assert.equal(r.status, 502);
  assert.equal((await r.json()).code, "email_delivery_unavailable");
  const none = await worker.fetch(postLead(buildLeadRequest("service", customer(), { requestId: requestId() })), {});
  assert.equal(none.status, 503);
});

test("GET /api/lead never exposes credentials; voice endpoints stay private off loopback", async () => {
  const worker = createSmartSiteWorker(config, { fetchImpl: async () => new Response("{}") });
  const status = await (await worker.fetch(new Request(`${PUBLIC_ORIGIN}/api/lead`), prodEnv())).json();
  assert.equal(status.ready, true);
  assert.doesNotMatch(JSON.stringify(status), /ss_|eeeeeeee/);
  assert.deepEqual(status.forms["urgent-request"].channels, ["phone", "email"]);
  // Text chat uses the signed-URL session route; it stays private off loopback.
  const voice = await worker.fetch(new Request(`${PUBLIC_ORIGIN}/api/elevenlabs/session`), { ELEVENLABS_API_KEY: "test-key", ELEVENLABS_AGENT_ID: "agent_test", ELEVENLABS_VOICE_PUBLIC: "true" });
  assert.equal(voice.status, 403);
  assert.equal((await worker.fetch(new Request(`${PUBLIC_ORIGIN}/api/weather/evidence`), {})).status, 404);
});

test("the Cloudflare entry (worker/index.js) routes to the core router", async (t) => {
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

test("the core router rate limits urgent requests per client and rejects a filled honeypot", async (t) => {
  const { resetMemoryRateLimits } = await import("../core/worker/abuse.js");
  resetMemoryRateLimits();
  const { fetchImpl } = growthosStub();
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  t.after(() => (globalThis.fetch = original));
  const entry = (await import("../worker/index.js")).default;
  const send = (body) => entry.fetch(new Request(`${PUBLIC_ORIGIN}/api/lead`, { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.77" }, body: JSON.stringify(body) }), prodEnv(), {});
  const trap = await send({ ...buildLeadRequest("urgent", customer({ issue: "no-heat" }), { requestId: requestId() }), website: "spam" });
  assert.equal(trap.status, 400);
  const statuses = [];
  for (let i = 0; i < 5; i++) statuses.push((await send(buildLeadRequest("urgent", customer({ issue: "no-heat" }), { requestId: requestId() }))).status);
  assert.equal(statuses.at(-1), 429, "the sixth request from one client in 10 minutes is limited");
});

test("CSS launches a text-only assistant: no voice token, status reports text mode", async () => {
  const config = (await import("../site.config.mjs")).default;
  assert.deepEqual(config.voice.modes, { text: true, voice: false });
  const entry = (await import("../worker/index.js")).default;
  const env = { ELEVENLABS_API_KEY: "test-key", ELEVENLABS_AGENT_ID: "agent_test" };
  const status = await entry.fetch(new Request("http://localhost/api/elevenlabs/status"), env, {});
  assert.deepEqual((await status.json()).modes, { text: true, voice: false });
  const token = await entry.fetch(new Request("http://localhost/api/elevenlabs/token", { headers: { "cf-connecting-ip": "203.0.113.90" } }), env, {});
  assert.equal(token.status, 404);
  assert.equal((await token.json()).code, "voice_mode_disabled");
});

test("an oversized chunked lead body is rejected with 413 before GrowthOS is contacted", async (t) => {
  const { resetMemoryRateLimits } = await import("../core/worker/abuse.js");
  resetMemoryRateLimits();
  const { calls, fetchImpl } = growthosStub();
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  t.after(() => (globalThis.fetch = original));
  const entry = (await import("../worker/index.js")).default;
  const big = JSON.stringify({ ...buildLeadRequest("service", customer({ issue: "no-heat" }), { requestId: requestId() }), notes: "x".repeat(20_000) });
  const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(big)); c.close(); } });
  const response = await entry.fetch(new Request(`${PUBLIC_ORIGIN}/api/lead`, { method: "POST", body, duplex: "half", headers: { "cf-connecting-ip": "203.0.113.95" } }), prodEnv(), {});
  assert.equal(response.status, 413);
  assert.equal(calls.length, 0);
});
