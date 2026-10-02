// Opt-in private process. It never loads dotenv, installs a daemon or chooses accounts.
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWebsiteAdapter } from '../src/lib/website-adapter/adapter.mjs';
import { writeWorkerHeartbeat } from '../src/lib/website-adapter/operations.mjs';
import { loadWebsiteSettings } from '../src/lib/growthos-server.mjs';

export function waitForCycle(signal, intervalMs = 60_000) {
  if (signal.aborted) return Promise.resolve();
  return new Promise((done) => {
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); done(); };
    const timer = setTimeout(finish, intervalMs);
    signal.addEventListener('abort', finish, { once: true });
  });
}

export async function runWebsiteWorker({
  env = process.env, signal, loadSettings = loadWebsiteSettings,
  createAdapter = createWebsiteAdapter, writeHeartbeat = writeWorkerHeartbeat,
  wait = waitForCycle, emit = (value) => process.stdout.write(`${JSON.stringify(value)}\n`),
} = {}) {
  if (env.GROWTHOS_WORKER_ENABLED !== 'true') throw new Error('worker_disabled');
  if (!signal) throw new Error('worker_signal_required');
  const { config } = loadSettings(env);
  const instanceId = randomUUID();
  let adapter;
  try {
    adapter = createAdapter(config);
    while (!signal.aborted) {
      const health = await adapter.drain();
      writeHeartbeat(config, { state: 'running', counts: health.counts, instanceId });
      emit({ event: 'growthos_delivery_health', counts: health.counts, totalRecords: health.totalRecords, capacity: health.capacity });
      if (!signal.aborted) await wait(signal);
    }
    writeHeartbeat(config, { state: 'stopped', instanceId, reason: 'worker_stopped' });
  } catch {
    try { writeHeartbeat(config, { state: 'failed', instanceId, reason: 'worker_failure' }); } catch { /* Existing stale heartbeat remains an alert; never claim success. */ }
    throw new Error('worker_failed');
  } finally { adapter?.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  runWebsiteWorker({ signal: controller.signal }).catch(() => {
    process.stderr.write('GrowthOS worker is disabled or unavailable. Check private configuration, journal and supervision.\n');
    process.exitCode = 1;
  }).finally(() => {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  });
}
