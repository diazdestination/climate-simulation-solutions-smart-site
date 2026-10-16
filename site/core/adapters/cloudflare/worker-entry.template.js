// Cloudflare Worker entry. Client-owned (not managed by sync-core): adjust imports only.
// createSmartSiteWorker returns { fetch, scheduled }; scheduled() drains the lead outbox.
import config from "../site.config.mjs";
import { assertSiteConfig } from "../core/config/schema.mjs";
import { createSmartSiteWorker } from "../core/worker/router.js";

export default createSmartSiteWorker(assertSiteConfig(config));
