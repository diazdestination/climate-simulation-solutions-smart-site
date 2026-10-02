import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createWebsiteAdapter } from '../src/lib/website-adapter/adapter.mjs';
import { CONTACT_POLICY_VERSION } from '../src/lib/request-policy.mjs';
import { createRequestLimiter, handleServiceRequest, handleRequestStatus, handleWebsiteOperations, toWebsiteIntake, websiteRequestsConfigured } from '../src/lib/growthos-server.mjs';

const folders = [];
const siteId = '11111111-1111-4111-8111-111111111111';
const token = 'a'.repeat(64);
const secret = `ss_${'b'.repeat(64)}`;
function setup(fetcher) {
  const folder = mkdtempSync(path.join(os.tmpdir(), 'css-adapter-test-')); folders.push(folder);
  const env = { SITE_ORIGIN: 'http://127.0.0.1:3000', NODE_ENV: 'test', GROWTHOS_ALLOW_LOCAL: 'true', GROWTHOS_OPERATOR_TOKEN: token,
    GROWTHOS_API_ORIGIN: 'http://127.0.0.1:49999', GROWTHOS_SITE_ID: siteId, GROWTHOS_SITE_SECRET: secret,
    GROWTHOS_JOURNAL_ENCRYPTION_KEY: 'c'.repeat(64), GROWTHOS_JOURNAL_PATH: path.join(folder, 'requests.sqlite'), GROWTHOS_CONTACT_POLICY_VERSION: CONTACT_POLICY_VERSION };
  const dependencies = { env, limit: () => {}, adapterFactory: (config) => createWebsiteAdapter(config, { fetch: fetcher ?? (() => { throw new Error('Unexpected network'); }) }) };
  return { env, dependencies };
}
function input(overrides = {}) {
  return { requestId: randomUUID(), intent: 'booking', name: 'Synthetic Customer', phone: '5551234567', email: 'qa@example.invalid',
    service: 'ac-repair', city: 'Synthetic City', preferredTime: 'Weekday morning', details: 'Synthetic unit test, no real customer', website: '', contactConsent: true, ...overrides };
}
function request(data, extraHeaders = {}, route = '/api/requests') {
  return new Request(`http://127.0.0.1:3000${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:3000', ...extraHeaders }, body: JSON.stringify(data) });
}
function ops(data, authorization = `Bearer ${token}`, extraHeaders = {}) {
  return new Request('http://127.0.0.1:3000/api/internal/growthos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization, ...extraHeaders }, body: JSON.stringify(data) });
}
const ack = () => ({ status: 'saved', leadId: randomUUID(), receiptId: randomUUID(), notification: 'staff-inbox', duplicate: false });
const upstream = (data, status = 200) => Response.json(data, { status });
afterEach(() => {
  for (const folder of folders.splice(0)) {
    assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(folder).startsWith('css-adapter-test-'));
    rmSync(folder, { force: true, recursive: true });
  }
});

test('configuration requires approved versioned contact copy, operator access and all private adapter settings', () => {
  const { env } = setup();
  assert.equal(websiteRequestsConfigured(env), true);
  assert.equal(websiteRequestsConfigured({ GROWTHOS_LEAD_WEBHOOK_URL: 'https://example.invalid', GROWTHOS_LEAD_WEBHOOK_TOKEN: 'obsolete' }), false);
  for (const key of ['SITE_ORIGIN', 'GROWTHOS_OPERATOR_TOKEN', 'GROWTHOS_CONTACT_POLICY_VERSION', 'GROWTHOS_JOURNAL_ENCRYPTION_KEY', 'GROWTHOS_SITE_SECRET']) assert.equal(websiteRequestsConfigured({ ...env, [key]: '' }), false);
  assert.equal(websiteRequestsConfigured({ ...env, GROWTHOS_CONTACT_POLICY_VERSION: 'unapproved-copy' }), false);
  assert.equal(websiteRequestsConfigured({ ...env, NODE_ENV: 'production' }), false);
});

test('actual service choices map into the HVAC contract while preserving intent and office approval', () => {
  const p = toWebsiteIntake(input({ intent: 'emergency', service: 'refrigeration' }));
  assert.equal(p.project.serviceCode, 'not-sure');
  assert.equal(p.project.timing, 'urgent');
  assert.match(p.project.summary, /Requested service: refrigeration/);
  assert.match(p.project.summary, /Preferred time: Weekday morning/);
  assert.match(p.project.summary, /Appointment: pending office approval/);
  assert.deepEqual(p.consent, { contact: true, policyVersion: CONTACT_POLICY_VERSION, channels: ['phone', 'email'], analytics: false });
  assert.deepEqual(toWebsiteIntake(input({ email: '' })).consent.channels, ['phone']);
  assert.equal(toWebsiteIntake(input({ service: 'system-replacement', intent: 'estimate' })).project.serviceCode, 'replacement');
  assert.equal(toWebsiteIntake(input({ service: 'maintenance' })).project.serviceCode, 'maintenance');
  assert.ok(toWebsiteIntake(input({ details: 'X'.repeat(1600), preferredTime: 'Y'.repeat(100) })).project.summary.length <= 2000);
});

test('explicit consent, stable UUID, strict fields and real phone length are required before any write', async () => {
  const { dependencies } = setup();
  for (const bad of [{ contactConsent: false }, { requestId: 'new' }, { phone: '1234567' }, { organizationId: randomUUID() }, { website: 'bot.invalid' }, { details: 'X'.repeat(1601) }, { service: 'unknown' }]) {
    const result = await handleServiceRequest(request(input(bad)), dependencies);
    assert.equal(result.status, 400);
    assert.equal((await result.json()).retained, false);
  }
});

test('exact configured Origin is mandatory; forwarded host and cross-site hints cannot bypass it', async () => {
  const { dependencies } = setup();
  for (const headers of [{ Origin: '' }, { Origin: 'https://attacker.invalid', 'X-Forwarded-Host': 'attacker.invalid' }, { Origin: 'http://127.0.0.1:3000/', 'Host': '127.0.0.1:3000' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.equal((await handleServiceRequest(request(input(), headers), dependencies)).status, 403);
    assert.equal((await handleRequestStatus(request({ requestId: randomUUID() }, headers), dependencies)).status, 403);
  }
});

test('body limits count actual bytes and status lookup rejects unexpected keys', async () => {
  const { dependencies } = setup();
  assert.equal((await handleServiceRequest(request(input({ details: '🔥'.repeat(3000) })), dependencies)).status, 413);
  assert.equal((await handleServiceRequest(request(input(), { 'Content-Type': 'text/plain' }), dependencies)).status, 415);
  assert.equal((await handleRequestStatus(request({ requestId: randomUUID(), email: 'qa@example.invalid' }), dependencies)).status, 400);
});

test('a stalled request body hits the read deadline and is cancelled before journal creation', async () => {
  const { dependencies } = setup(); let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const stalled = new Request('http://127.0.0.1:3000/api/requests', { method: 'POST', duplex: 'half',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:3000' }, body });
  const result = await handleServiceRequest(stalled, { ...dependencies, readTimeoutMs: 10 });
  assert.equal(result.status, 408);
  assert.equal((await result.json()).code, 'request_timeout');
  assert.equal(cancelled, true);
});

test('saved result requires a real receipt and replay creates one upstream request; public status has no internal identifiers or content', async () => {
  let calls = 0; const receipt = ack(); let captured;
  const { dependencies } = setup(async (_url, init) => { calls++; captured = JSON.parse(init.body); return upstream(receipt, 201); });
  const p = input();
  const first = await handleServiceRequest(request(p), dependencies);
  assert.equal(first.status, 201);
  assert.deepEqual(await first.json(), { status: 'saved', requestId: p.requestId, appointmentStatus: 'pending_office_approval' });
  assert.equal((await handleServiceRequest(request(p), dependencies)).status, 201);
  assert.equal(calls, 1);
  assert.equal(captured.requestId, p.requestId);
  const lookup = await handleRequestStatus(request({ requestId: p.requestId }), dependencies);
  const body = await lookup.text();
  for (const privateValue of [receipt.leadId, receipt.receiptId, p.name, p.phone, p.email, secret, token]) assert.equal(body.includes(privateValue), false);
  assert.equal(JSON.parse(body).status, 'saved');
  const conflict = await handleServiceRequest(request({ ...p, details: 'Changed request' }), dependencies);
  assert.equal(conflict.status, 409); assert.equal(calls, 1);
  assert.equal((await conflict.json()).code, 'idempotency_conflict');
});

test('lost acknowledgement persists as queued and public status can recover after a restart without form content', async () => {
  let calls = 0;
  const { dependencies } = setup(async () => { calls++; throw new Error('Synthetic lost ACK'); });
  const p = input();
  const response = await handleServiceRequest(request(p), dependencies);
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { status: 'queued', requestId: p.requestId, appointmentStatus: 'pending_office_approval', retained: true, code: 'delivery_pending' });
  const restored = await handleRequestStatus(request({ requestId: p.requestId }), dependencies);
  assert.equal((await restored.json()).status, 'queued');
  assert.equal(calls, 1); // Lookup never sends.
});

test('a generic 200 response cannot become saved', async () => {
  const { dependencies } = setup(async () => upstream({ ok: true }));
  const response = await handleServiceRequest(request(input()), dependencies);
  assert.equal(response.status, 202);
  assert.equal((await response.json()).status, 'queued');
});

test('missing responder is held, never accepted by office; authenticated review retry is explicit', async () => {
  let available = false; let calls = 0; const receipt = ack();
  const { dependencies } = setup(async () => { calls++; return available ? upstream(receipt, 201) : upstream({ error: 'site_staffing_unavailable' }, 503); });
  const p = input();
  const held = await handleServiceRequest(request(p), dependencies);
  assert.equal(held.status, 503);
  assert.equal((await held.json()).status, 'needs-review');
  await handleServiceRequest(request(p), dependencies); assert.equal(calls, 1);
  available = true;
  const denied = await handleWebsiteOperations(ops({ action: 'retry', requestId: p.requestId }, 'Bearer wrong'), dependencies);
  assert.equal(denied.status, 401); assert.equal(calls, 1);
  const reviewed = await handleWebsiteOperations(ops({ action: 'retry', requestId: p.requestId }), dependencies);
  assert.equal(reviewed.status, 200); assert.equal(calls, 2);
  assert.equal((await (await handleRequestStatus(request({ requestId: p.requestId }), dependencies)).json()).status, 'saved');
});

test('operations require a separate credential, reject browser origins and return safe health', async () => {
  const { dependencies } = setup();
  for (const [authorization, extra] of [[`Bearer ${secret}`, {}], ['', {}], [`Bearer ${token}`, { Origin: 'http://127.0.0.1:3000' }]]) assert.equal((await handleWebsiteOperations(ops({ action: 'inspect' }, authorization, extra), dependencies)).status, 401);
  const health = await handleWebsiteOperations(ops({ action: 'inspect' }), dependencies);
  assert.equal(health.status, 200);
  const body = await health.text(); assert.equal(body.includes(secret), false); assert.equal(body.includes(token), false);
  assert.equal(JSON.parse(body).result.totalRecords, 0);
  assert.equal((await handleWebsiteOperations(ops({ action: 'retry', requestId: randomUUID() }), dependencies)).status, 409);
});

test('unconfigured delivery and unknown references remain unconfirmed, with no raw error or path disclosure', async () => {
  const { dependencies } = setup();
  const unknown = await handleRequestStatus(request({ requestId: randomUUID() }), dependencies);
  assert.equal(unknown.status, 404); assert.equal((await unknown.json()).status, 'unconfirmed');
  const unconfigured = await handleServiceRequest(request(input()), { env: {} });
  assert.equal(unconfigured.status, 503);
  assert.deepEqual(await unconfigured.json(), { status: 'unconfirmed', code: 'delivery_unavailable', appointmentStatus: 'pending_office_approval', retained: false });
});

test('both public endpoints use a bounded process-wide rate limit with an explicit reset', async () => {
  let now = 1_000; const limit = createRequestLimiter(() => now);
  for (let i = 0; i < 120; i++) limit();
  assert.throws(limit, { code: 'too_many_requests' });
  const { dependencies } = setup();
  assert.equal((await handleServiceRequest(request(input()), { ...dependencies, limit })).status, 429);
  assert.equal((await handleRequestStatus(request({ requestId: randomUUID() }), { ...dependencies, limit })).status, 429);
  now += 60_000; assert.doesNotThrow(limit);
});
