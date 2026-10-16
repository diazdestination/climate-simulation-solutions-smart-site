// Cloudflare Worker entry for the CSS site. Client-owned (not managed by sync-core).
// createSmartSiteWorker returns { fetch, scheduled }; scheduled() drains the lead outbox (cron).
// Abuse protection (honeypot, per-client rate limits, Turnstile when configured) runs inside the
// core router for every lead, assistant, file and measurement route.
import config from "../site.config.mjs";
import { assertSiteConfig } from "../core/config/schema.mjs";
import { createSmartSiteWorker } from "../core/worker/router.js";

const worker = createSmartSiteWorker(assertSiteConfig(config));

export default {
  fetch: (request, env, ctx) => worker.fetch(request, env, ctx),
  scheduled: (event, env, ctx) => worker.scheduled(event, env, ctx),
};
