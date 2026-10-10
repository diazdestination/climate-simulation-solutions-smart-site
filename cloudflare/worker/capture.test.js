import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { captureRequest } from './capture.js';

const publicOrigin = 'http://127.0.0.1:4174';
const siteId = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
const leadId = '33333333-3333-4333-8333-333333333333';
const receiptId = '44444444-4444-4444-8444-444444444444';
const env = {
  HVAC_CAPTURE_ENABLED: 'true', HVAC_LOCAL_PREVIEW: 'true', HVAC_PUBLIC_ORIGIN: publicOrigin,
  GROWTHOS_API_ORIGIN: 'http://127.0.0.1:3001', GROWTHOS_SITE_ID: siteId,
  GROWTHOS_SITE_SECRET: `ss_${'a'.repeat(64)}`,
  HVAC_CONTACT_POLICY_VERSION: 'synthetic-qa-v1',
  HVAC_CONTACT_DISCLOSURE: 'Synthetic QA disclosure only. This is not an approved customer contact policy.',
};
const body = {
  requestId, name: 'Test Homeowner', phone: '+17068095070', email: 'test@example.test',
  serviceCode: 'maintenance', postalCode: '30534', timing: 'soon',
  summary: 'Synthetic routine service request.', contactConsent: true,
};
const status = (settings = env) => captureRequest(new Request(`${publicOrigin}/api/capture-status`), settings);
const post = (data = body, settings = env, source = publicOrigin) => captureRequest(new Request(`${publicOrigin}/api/lead`, {
  method: 'POST', headers: { origin: source, 'content-type': 'application/json' }, body: JSON.stringify(data),
}), settings, async (...args) => {
  throw new Error(`Unexpected upstream request: ${args[0]}`);
});

test('capture stays disabled without the HVAC-specific activation and reviewed disclosure', async () => {
  assert.deepEqual(await (await status({})).json(), { enabled: false });
  assert.equal((await post(body, {})).status, 503);
  assert.deepEqual(await (await status({ ...env, HVAC_CONTACT_DISCLOSURE: '' })).json(), { enabled: false });
  assert.deepEqual(await (await status({ ...env, HVAC_LOCAL_PREVIEW: 'false' })).json(), { enabled: false });
  assert.deepEqual(await (await status({ ...env, HVAC_PUBLIC_ORIGIN: 'https://client.example' })).json(), { enabled: false });
  assert.deepEqual(await (await status({ ...env, GROWTHOS_API_ORIGIN: 'https://api.example' })).json(), { enabled: false });
  assert.deepEqual(await (await status({ ...env, GROWTHOS_SITE_ID: 'not-a-uuid' })).json(), { enabled: false });
  assert.deepEqual(await (await status({ ...env, GROWTHOS_SITE_SECRET: 'wrong-key' })).json(), { enabled: false });
  const hosted = {
    ...env, HVAC_LOCAL_PREVIEW: undefined, HVAC_PUBLIC_ORIGIN: 'https://hvac.example.test',
    GROWTHOS_API_ORIGIN: 'https://app.mogulforge.ai',
  };
  const hostedStatus = await captureRequest(new Request('https://hvac.example.test/api/capture-status'), hosted);
  assert.equal((await hostedStatus.json()).enabled, true);
});

test('hosted mode never forwards the site secret to an arbitrary HTTPS origin', async () => {
  const hosted = {
    ...env, HVAC_LOCAL_PREVIEW: undefined, HVAC_PUBLIC_ORIGIN: 'https://hvac.example.test',
    GROWTHOS_API_ORIGIN: 'https://untrusted.example.test',
  };
  const hostedStatus = await captureRequest(new Request('https://hvac.example.test/api/capture-status'), hosted);
  assert.deepEqual(await hostedStatus.json(), { enabled: false });
  let calls = 0;
  const response = await captureRequest(new Request('https://hvac.example.test/api/lead', {
    method: 'POST', headers: { origin: 'https://hvac.example.test', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), hosted, async () => { calls++; return Response.json({ status: 'saved', leadId, receiptId, duplicate: false }, { status: 201 }); });
  assert.equal(response.status, 503);
  assert.equal(calls, 0);
});

test('server connector accepts a bounded inquiry and returns only real receipt IDs', async () => {
  const enabled = await (await status()).json();
  assert.equal(enabled.enabled, true);
  assert.equal(JSON.stringify(enabled).includes(env.GROWTHOS_SITE_SECRET), false);
  let calls = 0;
  const response = await captureRequest(new Request(`${publicOrigin}/api/lead`, {
    method: 'POST', headers: { origin: publicOrigin, 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), env, async (url, init) => {
    calls++;
    assert.equal(url, `http://127.0.0.1:3001/api/v1/public/smart-sites/${siteId}/intake`);
    assert.equal(init.headers.authorization, `Bearer ${env.GROWTHOS_SITE_SECRET}`);
    assert.equal(init.headers.origin, undefined);
    assert.equal(init.redirect, 'manual');
    const payload = JSON.parse(init.body);
    assert.equal(payload.requestId, requestId);
    assert.deepEqual(payload.consent.channels, ['phone', 'email']);
    assert.equal(payload.consent.analytics, false);
    assert.equal(JSON.stringify(payload).includes('organizationId'), false);
    assert.equal(JSON.stringify(payload).includes('sms'), false);
    return Response.json({ status: 'saved', leadId, receiptId, duplicate: false }, { status: 201 });
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { status: 'saved', leadId, receiptId });
  assert.equal(calls, 1);
});

test('wrong origins, injected tenant fields, and unapproved services cannot reach GrowthOS', async () => {
  assert.equal((await post(body, env, 'https://wrong.example')).status, 403);
  assert.equal((await post({ ...body, organizationId: siteId })).status, 400);
  assert.equal((await post({ ...body, serviceCode: 'commercial-refrigeration' })).status, 400);
  assert.equal((await post({ ...body, contactConsent: false })).status, 400);
  assert.equal((await post({ ...body, phone: '----------', email: '' })).status, 400);
  assert.equal((await post({ ...body, smsConsent: true })).status, 400);
});

test('input limits and media type fail closed before forwarding', async () => {
  assert.equal((await post({ ...body, summary: 'x'.repeat(9_000) })).status, 413);
  const wrongType = new Request(`${publicOrigin}/api/lead`, {
    method: 'POST', headers: { origin: publicOrigin, 'content-type': 'application/jsonp' },
    body: JSON.stringify(body),
  });
  assert.equal((await captureRequest(wrongType, env)).status, 415);
  const declaredOversize = new Request(`${publicOrigin}/api/lead`, {
    method: 'POST', headers: { origin: publicOrigin, 'content-type': 'application/json', 'content-length': '9000' },
    body: JSON.stringify(body),
  });
  assert.equal((await captureRequest(declaredOversize, env)).status, 413);
});

test('a duplicate receipt is a confirmed save, never a second lead', async () => {
  const request = new Request(`${publicOrigin}/api/lead`, {
    method: 'POST', headers: { origin: publicOrigin, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const response = await captureRequest(request, env, async () =>
    Response.json({ status: 'saved', leadId, receiptId, duplicate: true }, { status: 200 }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'saved', leadId, receiptId });
});

test('ambiguous or lost upstream response never claims a saved lead', async () => {
  const request = () => new Request(`${publicOrigin}/api/lead`, {
    method: 'POST', headers: { origin: publicOrigin, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const unavailable = await captureRequest(request(), env, async () => { throw new Error('synthetic timeout'); });
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: 'capture_unavailable' });
  const badReceipt = await captureRequest(request(), env, async () => Response.json({ queued: true }, { status: 202 }));
  assert.equal(badReceipt.status, 503);
  const missingSaved = await captureRequest(request(), env, async () => Response.json({ leadId, receiptId, duplicate: false }, { status: 201 }));
  assert.equal(missingSaved.status, 503);
  const malformed = await captureRequest(request(), env, async () => Response.json({ status: 'saved', leadId, receiptId, duplicate: 'false' }, { status: 201 }));
  assert.equal(malformed.status, 503);
  const queued = await captureRequest(request(), env, async () => Response.json({ status: 'saved', leadId, receiptId, duplicate: false }, { status: 202 }));
  assert.equal(queued.status, 503);
  const inconsistent = await captureRequest(request(), env, async () => Response.json({ status: 'saved', leadId, receiptId, duplicate: true }, { status: 201 }));
  assert.equal(inconsistent.status, 503);
  const huge = await captureRequest(request(), env, async () => new Response('x'.repeat(4_100), { status: 201 }));
  assert.equal(huge.status, 503);
  const redirect = await captureRequest(request(), env, async () => new Response(null, { status: 302, headers: { location: 'https://wrong.example' } }));
  assert.equal(redirect.status, 503);
  const review = await captureRequest(request(), env, async () => Response.json({ error: 'contact_match_needs_review' }, { status: 409 }));
  assert.equal(review.status, 409);
});
