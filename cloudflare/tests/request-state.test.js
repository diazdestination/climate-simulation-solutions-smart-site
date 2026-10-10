import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequestState, validCapability, validReceipt } from '../dist/request-state.js';
const id = '22222222-2222-4222-8222-222222222222';
const receipt = { status: 'saved', leadId: id, receiptId: '33333333-3333-4333-8333-333333333333' };
const capability = { enabled: true, disclosure: 'Synthetic inquiry-only contact disclosure for tests.', policyVersion: 'qa-v1' };
const fields = { name: 'Synthetic Customer', phone: '+17065550100', email: 'qa@example.test', postalCode: '30534', serviceCode: 'maintenance', timing: 'soon', summary: '', contactConsent: true };
function setup(fetcher) {
  const calls = [];
  const state = createRequestState({ fetcher: async (...args) => { calls.push(args); return fetcher(...args); }, randomUUID: () => id, signalForRequest: () => AbortSignal.timeout(100) });
  state.enable(capability);
  return { state, calls };
}
test('capability gate requires strict enabled value and reviewed policy metadata', () => {
  assert.equal(validCapability(capability), true);
  for (const bad of [null, {}, { ...capability, enabled: 'true' }, { ...capability, enabled: 1 }, { ...capability, policyVersion: '' }, { ...capability, disclosure: {} }, { ...capability, disclosure: 'short' }]) assert.equal(Boolean(validCapability(bad)), false);
});
test('receipt requires saved state, two UUIDs and exact 200/201 response', () => {
  for (const status of [200, 201]) assert.equal(validReceipt({ status }, receipt), true);
  for (const status of [202, 204, 302, 400, 503]) assert.equal(validReceipt({ status }, receipt), false);
  for (const value of [{}, { ...receipt, leadId: null }, { ...receipt, receiptId: 'anything' }, { ...receipt, status: 'queued' }, { ...receipt, leadId: [id] }]) assert.equal(validReceipt({ status: 200 }, value), false);
});
test('review and edits do not transmit; changed details require fresh review', async () => {
  const { state, calls } = setup(() => Response.json(receipt, { status: 201 }));
  assert.equal((await state.submit(fields)).kind, 'review');
  assert.equal(calls.length, 0);
  const corrected = { ...fields, name: 'Corrected Synthetic Customer' };
  assert.equal((await state.submit(corrected)).kind, 'review');
  assert.equal(calls.length, 0);
  assert.equal((await state.submit(corrected)).kind, 'saved');
  assert.equal(JSON.parse(calls[0][1].body).name, corrected.name);
  assert.equal(calls[0][0], '/api/lead');
  assert.equal(calls[0][1].redirect, 'error');
});
test('disabled capability and missing contact never transmit', async () => {
  const { state, calls } = setup(() => { throw Error('must not send'); });
  assert.equal((await state.submit({ ...fields, phone: '', email: '' })).kind, 'invalid');
  state.enable({ enabled: false });
  assert.equal((await state.submit(fields)).kind, 'unavailable');
  assert.equal(calls.length, 0);
});
test('uncertain receipt retries reuse same ID and cannot become a changed new lead', async () => {
  let count = 0;
  const { state, calls } = setup(() => ++count === 1 ? Response.json({ queued: true }) : Response.json(receipt));
  await state.submit(fields);
  assert.equal((await state.submit(fields)).kind, 'uncertain');
  assert.equal((await state.submit({ ...fields, phone: '+17065550101' })).kind, 'correction');
  assert.equal(calls.length, 1);
  assert.equal((await state.submit(fields)).kind, 'saved');
  assert.deepEqual(JSON.parse(calls[0][1].body), JSON.parse(calls[1][1].body));
  assert.equal((await state.submit(fields)).kind, 'saved');
  assert.equal((await state.submit({ ...fields, name: 'Different' })).kind, 'saved');
  assert.equal(calls.length, 2);
});
test('concurrent submits cannot create parallel requests', async () => {
  let finish;
  const { state, calls } = setup(() => new Promise(resolve => { finish = resolve; }));
  await state.submit(fields);
  const pending = state.submit(fields);
  assert.equal((await state.submit(fields)).kind, 'busy');
  assert.equal(calls.length, 1);
  finish(Response.json(receipt, { status: 201 }));
  assert.equal((await pending).kind, 'saved');
});
test('network failure and malformed JSON retain uncertain status', async () => {
  for (const fetcher of [() => { throw Error('timeout'); }, () => new Response('<html>not a receipt</html>'), () => Response.json(receipt, { status: 202 })]) {
    const { state } = setup(fetcher);
    await state.submit(fields);
    assert.equal((await state.submit(fields)).kind, 'uncertain');
  }
});
test('409 requests staff review and keeps the original submission ID', async () => {
  const { state, calls } = setup(() => Response.json({ error: 'needs_review' }, { status: 409 }));
  await state.submit(fields);
  assert.equal((await state.submit(fields)).kind, 'staff');
  assert.equal((await state.submit(fields)).kind, 'staff');
  assert.equal(JSON.parse(calls[0][1].body).requestId, JSON.parse(calls[1][1].body).requestId);
});
