// Lightweight DOM wiring tests, not a substitute for visual/browser QA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequestState } from '../dist/request-state.js';
const source = (await readFile(new URL('../dist/request-form.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/, '');
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const valid = { enabled: true, disclosure: 'Synthetic approved inquiry disclosure for testing only.', policyVersion: 'qa-v1' };
const flush = () => new Promise(resolve => setImmediate(resolve));
function mount(fetcher, capabilitySupport = true) {
  const elements = new Map();
  const listeners = {};
  const controls = [{ disabled: false }, { disabled: false }];
  for (const id of ['#serviceRequest', '#requestStatus', '#requestReview', '#requestReviewDetails', '#contactDisclosure', '#request', '#requestLink', 'button']) elements.set(id, { hidden: true, textContent: '', disabled: false, focus() { this.focused = true; } });
  const form = elements.get('#serviceRequest');
  Object.assign(form, { addEventListener: (event, callback) => { listeners[event] = callback; }, querySelector: () => elements.get('button'), querySelectorAll: () => controls, reportValidity: () => true, setAttribute() {}, removeAttribute() {} });
  const data = { name: 'Synthetic Customer', phone: '+17065550100', email: '', postalCode: '30534', serviceCode: 'maintenance', timing: 'soon', summary: '', contactConsent: 'on' };
  const run = new Function('createRequestState', 'document', 'fetch', 'crypto', 'AbortSignal', 'FormData', source);
  run(createRequestState, { querySelector: id => elements.get(id) }, fetcher,
    { randomUUID: capabilitySupport ? () => '22222222-2222-4222-8222-222222222222' : undefined }, AbortSignal,
    class { get(key) { return data[key]; } });
  return { elements, controls, listeners, data, submit: () => listeners.submit({ preventDefault() {} }) };
}
test('static HTML hides both inquiry entrypoints and review region', () => {
  for (const id of ['request', 'requestLink', 'requestReview']) assert.match(html, new RegExp(`<[^>]+id="${id}"[^>]* hidden`));
  assert.match(html, /type="module" src="request-form.js"/);
});
test('status unavailable, malformed, false, or network failure leaves form and link hidden', async () => {
  for (const fetcher of [async () => new Response('', { status: 404 }), async () => Response.json({ enabled: false }), async () => Response.json({ ...valid, enabled: 'true' }), async () => new Response('<html>fallback</html>'), async () => { throw Error('offline'); }]) {
    const { elements } = mount(fetcher);
    await flush();
    assert.equal(elements.get('#request').hidden, true);
    assert.equal(elements.get('#requestLink').hidden, true);
  }
});
test('unsupported browser keeps capture closed without a network request', async () => {
  let calls = 0;
  const { elements } = mount(async () => { calls++; return Response.json(valid); }, false);
  await flush();
  assert.equal(calls, 0);
  assert.equal(elements.get('#request').hidden, true);
});
test('review/edit is local; sending freezes details; durable save prevents another submission', async () => {
  let count = 0;
  let finish;
  const { elements, listeners, data, controls, submit } = mount(async url => {
    if (url === '/api/capture-status') return Response.json(valid);
    count++;
    return new Promise(resolve => { finish = resolve; });
  });
  await flush();
  assert.equal(elements.get('#request').hidden, false);
  await submit();
  assert.equal(count, 0);
  assert.equal(elements.get('#requestReview').hidden, false);
  assert.equal(elements.get('#requestReview').focused, true);
  data.name = '<script>synthetic</script>';
  listeners.input();
  assert.equal(elements.get('#requestReview').hidden, true);
  await submit();
  assert.equal(count, 0);
  assert.match(elements.get('#requestReviewDetails').textContent, /<script>synthetic<\/script>/);
  const pending = submit();
  assert.equal(controls.every(control => control.disabled), true);
  await submit();
  assert.equal(count, 1);
  finish(Response.json({ status: 'saved', leadId: '33333333-3333-4333-8333-333333333333', receiptId: '44444444-4444-4444-8444-444444444444' }, { status: 201 }));
  await pending;
  assert.equal(elements.get('button').disabled, true);
  assert.equal(controls.every(control => control.disabled), true);
  await submit();
  assert.equal(count, 1);
});

test('editing and restoring an uncertain request requires local review before retry', async () => {
  const payloads = [];
  const { elements, listeners, data, submit } = mount(async (url, init) => {
    if (url === '/api/capture-status') return Response.json(valid);
    payloads.push(JSON.parse(init.body));
    return Response.json({ queued: true });
  });
  await flush();
  await submit(); // First local review.
  await submit(); // Ambiguous save attempt.
  assert.equal(payloads.length, 1);
  assert.equal(elements.get('button').textContent, 'Retry same request');
  const originalName = data.name;
  data.name = 'Changed Synthetic Customer';
  listeners.input();
  data.name = originalName;
  listeners.input();
  assert.equal(elements.get('button').textContent, 'Review request');
  await submit(); // Must review, not silently send the existing pending payload.
  assert.equal(payloads.length, 1);
  assert.equal(elements.get('#requestReview').hidden, false);
  assert.equal(elements.get('button').textContent, 'Send request');
  await submit();
  assert.equal(payloads.length, 2);
  assert.deepEqual(payloads[1], payloads[0]);
});
