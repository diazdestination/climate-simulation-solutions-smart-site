// Start under a supervised private Node process with the server environment
// already loaded. No dotenv loading, account discovery, or background install.
import { createWebsiteAdapter } from '../src/lib/website-adapter/adapter.mjs';
import { loadWebsiteSettings } from '../src/lib/growthos-server.mjs';

if (process.env.GROWTHOS_WORKER_ENABLED !== 'true') {
  process.stderr.write('GrowthOS worker is disabled. Explicit operator enablement is required.\n');
  process.exitCode = 1;
} else {
  let stopping = false;
  let wake;
  const stop = () => { stopping = true; wake?.(); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    const { config } = loadWebsiteSettings();
    const adapter = createWebsiteAdapter(config);
    try {
      while (!stopping) {
        const health = await adapter.drain();
        // Counts only. Never print credentials, request bodies, names or addresses.
        process.stdout.write(`${JSON.stringify({ event: 'growthos_delivery_health', counts: health.counts, totalRecords: health.totalRecords, capacity: health.capacity })}\n`);
        if (stopping) break;
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 60_000);
          wake = () => { clearTimeout(timer); resolve(); };
        });
      }
    } finally { adapter.close(); }
  } catch {
    process.stderr.write('GrowthOS worker stopped: configuration or journal unavailable. Inspect with the authenticated operator endpoint.\n');
    process.exitCode = 1;
  }
}
