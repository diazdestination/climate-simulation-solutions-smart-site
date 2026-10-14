// Cloudflare Worker entry for the CSS site. Client-owned (not managed by sync-core).
// createSmartSiteWorker returns { fetch, scheduled }; scheduled() drains the lead outbox (cron).
import config from "../site.config.mjs";
import { assertSiteConfig } from "../core/config/schema.mjs";
import { createSmartSiteWorker } from "../core/worker/router.js";
import { abuseGuard } from "./abuse-guard.js";

const worker = createSmartSiteWorker(assertSiteConfig(config));

export default {
  async fetch(request, env, ctx) {
    const blocked = await abuseGuard(request, env, ctx);
    return blocked ?? worker.fetch(request, env, ctx);
  },
  scheduled: (event, env, ctx) => worker.scheduled(event, env, ctx),
};
