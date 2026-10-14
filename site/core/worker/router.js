// createSmartSiteWorker(config) -> { fetch, scheduled }
// Runtime-neutral: uses only Web Request/Response/fetch/crypto. Host adapters
// (adapters/cloudflare, adapters/openai-sites) wire env bindings (DB, ASSETS) and cron.
import { normalizeEnv } from "./env.js";
import { json } from "./http.js";
import {
  createGrowthOSConnector,
  growthOSOwnsLeadAutomations,
} from "./growthos-connector.js";
import { handleEmailBridgeLead } from "./email-bridge.js";
import {
  VOICE_PATHS,
  handleVoiceSessionRequest,
  handleVoiceFileRequest,
} from "./voice-proxy.js";
import {
  WEATHER_EVIDENCE_PATH,
  handleWeatherEvidenceRequest,
} from "../modules/weather-hail.js";

export const OUTBOX_OPERATIONS_PATH = "/api/internal/lead-outbox";

async function serveAsset(request, env, mode) {
  if (!env.ASSETS?.fetch) return new Response("Not found", { status: 404 });
  const response = await env.ASSETS.fetch(request);
  const acceptsHtml = request.headers.get("accept")?.includes("text/html");
  if (
    mode === "none" ||
    response.status !== 404 ||
    !acceptsHtml ||
    !["GET", "HEAD"].includes(request.method)
  )
    return response;
  const indexUrl = new URL(request.url);
  const normalizedPath = indexUrl.pathname.replace(/\/+$/, "");
  if (normalizedPath && !normalizedPath.split("/").at(-1)?.includes(".")) {
    indexUrl.pathname = `${normalizedPath}/index.html`;
    indexUrl.search = "";
    const routePage = await env.ASSETS.fetch(new Request(indexUrl, request));
    if (routePage.status !== 404) return routePage;
  }
  if (mode !== "route-then-index") return response;
  indexUrl.pathname = "/index.html";
  indexUrl.search = "";
  return env.ASSETS.fetch(new Request(indexUrl, request));
}

/**
 * @param {object} config validated site config (core/config/schema.mjs)
 * @param {{ fetchImpl?: typeof fetch }} [options] fetchImpl is for tests; defaults to global fetch at call time
 */
export function createSmartSiteWorker(config, options = {}) {
  const outboundFetch = (...args) => (options.fetchImpl ?? globalThis.fetch)(...args);
  const growthos = createGrowthOSConnector(config);
  const leadPaths = new Set(config?.growthos?.leadPaths ?? ["/api/lead"]);
  const voiceEnabled = config?.voice?.enabled === true;
  const weatherEnabled = config?.modules?.weatherHail?.enabled === true;
  const assetMode = config?.assets?.htmlFallback ?? "route-only";

  async function fetchHandler(request, rawEnv) {
    const env = normalizeEnv(rawEnv);
    const pathname = new URL(request.url).pathname;
    if (pathname === OUTBOX_OPERATIONS_PATH)
      return growthos.handleOutboxOperations(request, env, outboundFetch);
    if (leadPaths.has(pathname)) {
      // GrowthOS connected (env flag or config intent) => every form goes to GrowthOS
      // and the email bridge cannot run.
      if (growthOSOwnsLeadAutomations(env, config) || config?.emailBridge?.enabled !== true)
        return growthos.handleLead(request, env, outboundFetch);
      return handleEmailBridgeLead(request, env, config, outboundFetch);
    }
    if (pathname.startsWith("/api/acquisition/"))
      return growthos.handleAcquisition(request, env, outboundFetch);
    if (
      pathname === VOICE_PATHS.status ||
      pathname === VOICE_PATHS.session ||
      pathname === VOICE_PATHS.token
    ) {
      if (!voiceEnabled) return json({ ready: false, code: "voice_disabled" }, 404);
      return handleVoiceSessionRequest(request, env, config, outboundFetch);
    }
    if (pathname === VOICE_PATHS.files) {
      if (!voiceEnabled) return json({ ready: false, code: "voice_disabled" }, 404);
      return handleVoiceFileRequest(request, env, config, outboundFetch);
    }
    if (pathname === WEATHER_EVIDENCE_PATH) {
      if (!weatherEnabled) return json({ ready: false, code: "module_disabled" }, 404);
      return handleWeatherEvidenceRequest(request, outboundFetch);
    }
    // Unknown API routes never fall through to an HTML shell.
    if (pathname === "/api" || pathname.startsWith("/api/"))
      return json({ code: "not_found" }, 404);
    return serveAsset(request, env, assetMode);
  }

  async function scheduled(_event, rawEnv, ctx) {
    const work = growthos
      .scheduledDrain(normalizeEnv(rawEnv), outboundFetch)
      .catch(() => ({ skipped: "drain_failed" }));
    if (ctx?.waitUntil) ctx.waitUntil(work);
    return work;
  }

  return { fetch: fetchHandler, scheduled };
}
