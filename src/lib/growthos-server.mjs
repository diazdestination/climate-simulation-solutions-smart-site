/** Private Node runtime only. Credentials and request payloads never enter public responses. */
import { timingSafeEqual } from 'node:crypto';
import { createWebsiteAdapter, validateAdapterConfig, WebsiteAdapterError } from './website-adapter/adapter.mjs';
import { CONTACT_POLICY_VERSION } from './request-policy.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const intents = ['booking', 'emergency', 'estimate', 'maintenance'];
const serviceCodes = { 'ac-repair': 'repair', 'heating-repair': 'repair', 'system-replacement': 'replacement', maintenance: 'maintenance', refrigeration: 'not-sure', 'indoor-air-quality': 'not-sure', other: 'not-sure' };
const appointmentStatus = 'pending_office_approval';
const json = (body, status = 200) => Response.json(body, { status, headers });
const fail = (code, status = 400) => { throw new WebsiteAdapterError(code, status); };

export function loadWebsiteSettings(env = process.env) {
  const allowLocal = env.GROWTHOS_ALLOW_LOCAL === 'true' && env.NODE_ENV !== 'production';
  let origin;
  try { origin = new URL(env.SITE_ORIGIN); } catch { fail('website_unconfigured', 503); }
  const local = allowLocal && origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname);
  if ((!local && origin.protocol !== 'https:') || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash ||
      env.GROWTHOS_CONTACT_POLICY_VERSION !== CONTACT_POLICY_VERSION || !/^[a-f0-9]{64}$/i.test(env.GROWTHOS_OPERATOR_TOKEN ?? '')) fail('website_unconfigured', 503);
  const config = validateAdapterConfig({
    apiOrigin: env.GROWTHOS_API_ORIGIN, siteId: env.GROWTHOS_SITE_ID, siteSecret: env.GROWTHOS_SITE_SECRET,
    encryptionKey: env.GROWTHOS_JOURNAL_ENCRYPTION_KEY, journalPath: env.GROWTHOS_JOURNAL_PATH,
    allowLocal,
  });
  return { config, siteOrigin: origin.origin, operatorToken: env.GROWTHOS_OPERATOR_TOKEN };
}

export function websiteRequestsConfigured(env = process.env) {
  try { loadWebsiteSettings(env); return true; } catch { return false; }
}

async function readJson(request, maxBytes, timeoutMs = 5000) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') fail('expected_json', 415);
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) fail('request_too_large', 413);
  const reader = request.body?.getReader();
  if (!reader) fail('invalid_request');
  let timer;
  const deadline = new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new WebsiteAdapterError('request_timeout', 408)), Math.max(1, Math.min(timeoutMs, 5000))); });
  const chunks = [];
  try {
    let bytes = 0;
    while (true) {
      const chunk = await Promise.race([reader.read(), deadline]);
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) fail('request_too_large', 413);
      chunks.push(Buffer.from(chunk.value));
    }
  } catch (error) {
    // Do not await cancellation of an unresponsive client stream.
    void reader.cancel().catch(() => {});
    throw error;
  } finally { clearTimeout(timer); }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail('invalid_request'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('invalid_request');
  return data;
}

// A process-wide backstop independent of spoofable proxy/IP headers. Hosting
// must also enforce a cross-instance limit before this private candidate launches.
export function createRequestLimiter(now = Date.now) {
  let windowStart = now(); let count = 0;
  return () => {
    const time = now();
    if (time - windowStart >= 60_000) { windowStart = time; count = 0; }
    if (++count > 120) fail('too_many_requests', 429);
  };
}
const publicLimit = createRequestLimiter();

function assertOrigin(request, settings) {
  if (request.headers.get('origin') !== settings.siteOrigin) fail('invalid_origin', 403);
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') fail('invalid_origin', 403);
}

function field(data, name, min, max) {
  const value = data[name];
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail('check_required_fields');
  return value.trim();
}

export function toWebsiteIntake(data) {
  const allowed = ['requestId', 'intent', 'name', 'phone', 'email', 'service', 'city', 'preferredTime', 'details', 'website', 'contactConsent'];
  if (Object.keys(data).some((key) => !allowed.includes(key))) fail('invalid_request');
  if (!UUID.test(data.requestId ?? '')) fail('invalid_request_id');
  if (data.website !== '' || data.contactConsent !== true || !intents.includes(data.intent) || !Object.hasOwn(serviceCodes, data.service)) fail('check_required_fields');
  const name = field(data, 'name', 2, 100);
  const phone = field(data, 'phone', 10, 30);
  const email = field(data, 'email', 0, 200);
  const city = field(data, 'city', 1, 100);
  const preferredTime = field(data, 'preferredTime', 0, 100);
  const details = field(data, 'details', 1, 1600);
  if (!/^\+?[0-9 ().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 10 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) fail('check_required_fields');
  const summary = [`Website request: ${data.intent}`, `Requested service: ${data.service}`, `Preferred time: ${preferredTime || 'Not specified'}`, 'Appointment: pending office approval', '', details].join('\n');
  return {
    schemaVersion: 1, requestId: data.requestId.toLowerCase(), contact: { name, phone, ...(email ? { email } : {}) },
    project: { serviceCode: serviceCodes[data.service], city, summary, timing: data.intent === 'emergency' ? 'urgent' : data.intent === 'estimate' ? 'planning' : 'soon' },
    consent: { contact: true, policyVersion: CONTACT_POLICY_VERSION, channels: email ? ['phone', 'email'] : ['phone'], analytics: false },
  };
}

function publicDelivery(result) {
  return { status: result.status, requestId: result.requestId, appointmentStatus,
    ...(result.status === 'saved' ? {} : { retained: result.retained, code: result.status === 'queued' ? 'delivery_pending' : 'office_delivery_unconfirmed' }) };
}

function publicError(error, requestId, submitted = false) {
  const known = error instanceof WebsiteAdapterError;
  const code = known ? error.code : 'delivery_unavailable';
  const safeCodes = ['expected_json', 'request_too_large', 'request_timeout', 'invalid_request', 'invalid_request_id', 'invalid_origin', 'check_required_fields', 'too_many_requests', 'idempotency_conflict', 'request_unknown'];
  return json({ status: 'unconfirmed', code: safeCodes.includes(code) ? code : 'delivery_unavailable', appointmentStatus,
    ...(requestId ? { requestId } : {}), ...(!submitted ? { retained: false } : {}) }, known ? error.status : 503);
}

export async function handleServiceRequest(request, dependencies = {}) {
  let adapter; let requestId; let submitted = false;
  try {
    const settings = loadWebsiteSettings(dependencies.env);
    assertOrigin(request, settings); (dependencies.limit ?? publicLimit)();
    const data = await readJson(request, 8192, dependencies.readTimeoutMs);
    const payload = toWebsiteIntake(data); requestId = payload.requestId;
    adapter = (dependencies.adapterFactory ?? createWebsiteAdapter)(settings.config);
    submitted = true;
    const delivery = await adapter.submit(payload);
    return json(publicDelivery(delivery), delivery.status === 'saved' ? 201 : delivery.status === 'queued' ? 202 : 503);
  } catch (error) { return publicError(error, requestId, submitted); }
  finally { adapter?.close(); }
}

export async function handleRequestStatus(request, dependencies = {}) {
  let adapter; let requestId;
  try {
    const settings = loadWebsiteSettings(dependencies.env);
    assertOrigin(request, settings); (dependencies.limit ?? publicLimit)();
    const data = await readJson(request, 1024, dependencies.readTimeoutMs);
    if (Object.keys(data).some((key) => key !== 'requestId') || !UUID.test(data.requestId ?? '')) fail('invalid_request_id');
    requestId = data.requestId.toLowerCase();
    adapter = (dependencies.adapterFactory ?? createWebsiteAdapter)(settings.config);
    return json(publicDelivery(adapter.lookup(requestId)));
  } catch (error) { return publicError(error, requestId, true); }
  finally { adapter?.close(); }
}

export async function handleWebsiteOperations(request, dependencies = {}) {
  let adapter;
  try {
    const settings = loadWebsiteSettings(dependencies.env);
    const authorization = request.headers.get('authorization') ?? '';
    const expected = `Bearer ${settings.operatorToken}`;
    if (request.headers.has('origin') || authorization.length !== expected.length || !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))) return json({ code: 'unauthorized' }, 401);
    const data = await readJson(request, 1024, dependencies.readTimeoutMs);
    if (Object.keys(data).some((key) => !['action', 'requestId'].includes(key)) || !['check', 'inspect', 'drain', 'retry'].includes(data.action) ||
        (data.action === 'retry' ? !UUID.test(data.requestId ?? '') : data.requestId !== undefined)) fail('invalid_operation');
    adapter = (dependencies.adapterFactory ?? createWebsiteAdapter)(settings.config);
    const result = data.action === 'check' ? await adapter.checkConnection() : data.action === 'inspect' ? adapter.inspect() : await adapter.drain(data.action === 'retry' ? { retryRequestId: data.requestId } : undefined);
    return json({ action: data.action, result });
  } catch (error) {
    const safeCodes = ['invalid_operation', 'request_not_retryable', 'connection_not_verified', 'connection_check_unavailable'];
    return json({ code: error instanceof WebsiteAdapterError && safeCodes.includes(error.code) ? error.code : 'operation_unavailable' }, error instanceof WebsiteAdapterError ? error.status : 503);
  } finally { adapter?.close(); }
}
