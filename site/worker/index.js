// Cloudflare Worker entry for the CSS site. Client-owned (not managed by sync-core).
// createSmartSiteWorker returns { fetch, scheduled }; scheduled() drains the lead outbox (cron).
// Abuse protection (honeypot, per-client rate limits, Turnstile when configured) runs inside the
// core router for every lead, assistant, file and measurement route.
import config from "../site.config.mjs";
import { assertSiteConfig } from "../core/config/schema.mjs";
import { createSmartSiteWorker } from "../core/worker/router.js";
import { isOutdoorRequest, outdoorResponse } from "./outdoor.js";
import { createElevenLabsFetch } from "./elevenlabs-fetch.js";

const worker = createSmartSiteWorker(assertSiteConfig(config), { fetchImpl: createElevenLabsFetch() });

// The outdoor reading is the same for every visitor, so it is cached at the edge for 15 minutes
// and weather.gov is asked at most a few times an hour.
async function outdoor(request, ctx) {
  const cache = globalThis.caches?.default;
  const key = new Request(new URL("/api/outdoor", request.url).toString());
  const hit = await cache?.match(key);
  if (hit) return hit;
  const response = await outdoorResponse();
  if (response.ok && cache) ctx?.waitUntil?.(cache.put(key, response.clone()));
  return response;
}

export default {
  fetch: (request, env, ctx) => (isOutdoorRequest(request) ? outdoor(request, ctx) : worker.fetch(request, env, ctx)),
  scheduled: (event, env, ctx) => worker.scheduled(event, env, ctx),
};
