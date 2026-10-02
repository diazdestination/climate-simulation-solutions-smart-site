import test from 'node:test';
import assert from 'node:assert/strict';
import { runWebsiteWorker, waitForCycle } from '../scripts/growthos-worker.mjs';

const counts = { queued: 1, processing: 0, saved: 0, 'needs-review': 0, expired: 0 };
test('worker remains explicitly opt-in and does not read settings when disabled', async () => {
  let read = false;
  await assert.rejects(runWebsiteWorker({ env: {}, loadSettings: () => { read = true; } }), /worker_disabled/);
  assert.equal(read, false);
});

test('worker writes successful heartbeat after drain, then a stopped state and closes on cancellation', async () => {
  const controller = new AbortController(); const events = [], beats = []; let closed = false;
  await runWebsiteWorker({
    env: { GROWTHOS_WORKER_ENABLED: 'true' }, signal: controller.signal,
    loadSettings: () => ({ config: {} }),
    createAdapter: () => ({ drain: async () => ({ counts, totalRecords: 1, capacity: 100 }), close: () => { closed = true; } }),
    writeHeartbeat: (_config, beat) => beats.push(beat), emit: (value) => events.push(value),
    wait: async () => controller.abort(),
  });
  assert.deepEqual(beats.map((beat) => beat.state), ['running', 'stopped']);
  assert.equal(beats[0].instanceId, beats[1].instanceId);
  assert.deepEqual(events, [{ event: 'growthos_delivery_health', counts, totalRecords: 1, capacity: 100 }]);
  assert.equal(closed, true);
});

test('drain and heartbeat disk failures are fatal, publish failure when possible, and close the adapter', async () => {
  for (const location of ['drain', 'heartbeat']) {
    const controller = new AbortController(); const beats = []; let closed = false;
    await assert.rejects(runWebsiteWorker({
      env: { GROWTHOS_WORKER_ENABLED: 'true' }, signal: controller.signal,
      loadSettings: () => ({ config: {} }),
      createAdapter: () => ({ drain: async () => { if (location === 'drain') throw new Error('private body must not escape'); return { counts }; }, close: () => { closed = true; } }),
      writeHeartbeat: (_config, beat) => { beats.push(beat); if (location === 'heartbeat') throw new Error('disk full'); },
      emit: () => assert.fail('failed cycle must not emit success'),
    }), { message: 'worker_failed' });
    assert.equal(beats.at(-1).state, 'failed'); assert.equal(closed, true);
  }
});

test('worker delay wakes promptly on termination and accepts an already aborted signal', async () => {
  const controller = new AbortController();
  const waiting = waitForCycle(controller.signal); controller.abort(); await waiting;
  await waitForCycle(controller.signal);
});
