// Climate Simulation Solutions only. This adapter is inactive unless its own
// server-side site credential, reviewed disclosure, and exact origin are set.
// It does not use or discover any other contractor's tenant or credentials.

const SERVICES = new Set(['repair', 'replacement', 'maintenance', 'new-installation', 'not-sure']);
const TIMING = new Set(['urgent', 'soon', 'planning', 'unsure']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_BYTES = 8_000;
const MAX_UPSTREAM_BYTES = 4_000;
const GROWTHOS_PRODUCTION_ORIGIN = 'https://app.mogulforge.ai';
const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

async function boundedJson(response, limit) {
  if (!response.body) return { value: null, tooLarge: false };
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      void reader.cancel().catch(() => {});
      return { value: null, tooLarge: true };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), tooLarge: false };
  } catch {
    return { value: null, tooLarge: false };
  }
}

function origin(value, allowLocal = false) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    if (url.protocol === 'https:') return url.origin;
    if (allowLocal && url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)) return url.origin;
  } catch { /* invalid configuration fails closed */ }
  return null;
}

function isLocalOrigin(value) {
  if (!value) return false;
  const url = new URL(value);
  return url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
}

function configuration(env) {
  if (env.HVAC_CAPTURE_ENABLED !== 'true') return null;
  const local = env.HVAC_LOCAL_PREVIEW === 'true';
  const publicOrigin = origin(env.HVAC_PUBLIC_ORIGIN || '', local);
  const apiOrigin = origin(env.GROWTHOS_API_ORIGIN || '', local);
  const siteId = env.GROWTHOS_SITE_ID || '';
  const secret = env.GROWTHOS_SITE_SECRET || '';
  const policyVersion = env.HVAC_CONTACT_POLICY_VERSION || '';
  const disclosure = env.HVAC_CONTACT_DISCLOSURE || '';
  const trustedDestination = local
    ? isLocalOrigin(publicOrigin) && isLocalOrigin(apiOrigin)
    : apiOrigin === GROWTHOS_PRODUCTION_ORIGIN;
  if (!publicOrigin || !apiOrigin || !trustedDestination ||
      !UUID.test(siteId) || !/^ss_[a-f0-9]{64}$/i.test(secret) ||
      !/^[a-zA-Z0-9._-]{1,80}$/.test(policyVersion) || disclosure.trim().length < 30 || disclosure.length > 500) return null;
  return { publicOrigin, apiOrigin, siteId, secret, policyVersion, disclosure: disclosure.trim() };
}

function text(value, max) {
  return typeof value === 'string' && value.trim().length <= max ? value.trim() : null;
}

function normalize(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const allowed = new Set(['requestId', 'name', 'email', 'phone', 'serviceCode', 'postalCode', 'summary', 'timing', 'contactConsent']);
  if (Object.keys(body).some(key => !allowed.has(key))) return null;
  const requestId = text(body.requestId, 36);
  const name = text(body.name, 100);
  const email = text(body.email, 254);
  const phone = text(body.phone, 30);
  const serviceCode = text(body.serviceCode, 60);
  const postalCode = text(body.postalCode, 5);
  const summary = text(body.summary, 2000);
  const timing = text(body.timing, 20) || 'unsure';
  if (!UUID.test(requestId || '') || !name || name.length < 2 || !SERVICES.has(serviceCode) ||
      !TIMING.has(timing) || body.contactConsent !== true) return null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (phone && (!/^\+?[0-9 ()-]{10,30}$/.test(phone) || phone.replace(/\D/g, '').length < 10)) return null;
  if (!email && !phone) return null;
  if (postalCode && !/^\d{5}$/.test(postalCode)) return null;
  return { requestId, name, email: email?.toLowerCase(), phone, serviceCode, postalCode, summary, timing };
}

export async function captureRequest(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  if (url.pathname === '/api/capture-status' && request.method === 'GET') {
    const config = configuration(env);
    return json(config && url.origin === config.publicOrigin
      ? { enabled: true, disclosure: config.disclosure, policyVersion: config.policyVersion }
      : { enabled: false });
  }
  if (url.pathname !== '/api/lead' || request.method !== 'POST') return json({ error: 'not_found' }, 404);
  const config = configuration(env);
  if (!config || url.origin !== config.publicOrigin) return json({ error: 'capture_unavailable' }, 503);
  if (request.headers.get('origin') !== config.publicOrigin) return json({ error: 'invalid_origin' }, 403);
  if ((request.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase() !== 'application/json')
    return json({ error: 'invalid_content_type' }, 415);
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES)
    return json({ error: 'request_too_large' }, 413);
  let parsed;
  try { parsed = await boundedJson(request, MAX_REQUEST_BYTES); }
  catch { return json({ error: 'invalid_request' }, 400); }
  if (parsed.tooLarge) return json({ error: 'request_too_large' }, 413);
  const body = parsed.value;
  if (body === null) return json({ error: 'invalid_request' }, 400);
  const lead = normalize(body);
  if (!lead) return json({ error: 'invalid_request' }, 400);
  const channels = [lead.phone && 'phone', lead.email && 'email'].filter(Boolean);
  const payload = {
    schemaVersion: 1,
    requestId: lead.requestId,
    contact: { name: lead.name, ...(lead.email ? { email: lead.email } : {}), ...(lead.phone ? { phone: lead.phone } : {}) },
    project: {
      serviceCode: lead.serviceCode,
      ...(lead.postalCode ? { postalCode: lead.postalCode } : {}),
      ...(lead.summary ? { summary: lead.summary } : {}),
      timing: lead.timing,
    },
    consent: { contact: true, policyVersion: config.policyVersion, analytics: false, channels },
  };
  try {
    const upstream = await fetcher(`${config.apiOrigin}/api/v1/public/smart-sites/${config.siteId}/intake`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.secret}` },
      body: JSON.stringify(payload),
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    if (!upstream.ok) return json({ error: upstream.status === 409 ? 'needs_review' : 'capture_unavailable' }, upstream.status === 409 ? 409 : 503);
    const { value: result } = await boundedJson(upstream, MAX_UPSTREAM_BYTES);
    if (result?.status !== 'saved' || !UUID.test(result.leadId || '') || !UUID.test(result.receiptId || '') ||
        typeof result.duplicate !== 'boolean' ||
        (result.duplicate ? upstream.status !== 200 : upstream.status !== 201))
      return json({ error: 'capture_unavailable' }, 503);
    return json({ status: 'saved', leadId: result.leadId, receiptId: result.receiptId }, result.duplicate ? 200 : 201);
  } catch {
    // No journal in this HVAC adapter yet. The browser must preserve the form
    // and retry with the same requestId; never claim the inquiry was saved.
    return json({ error: 'capture_unavailable' }, 503);
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/capture-status' || path === '/api/lead') return captureRequest(request, env);
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  },
};
