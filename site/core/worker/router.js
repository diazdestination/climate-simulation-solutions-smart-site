// createSmartSiteWorker(config) -> { fetch, scheduled }
// Runtime-neutral: uses only Web Request/Response/fetch/crypto. Host adapters
// (adapters/cloudflare, adapters/openai-sites) wire env bindings (DB, ASSETS) and cron.
import { normalizeEnv, resolveSecretBindings } from "./env.js";
import { BodyTooLargeError, json, readBoundedText } from "./http.js";
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

import {
  checkRateLimit,
  honeypotTripped,
  publicProtectionSettings,
  tooManyRequests,
  turnstileConfigured,
  verifyBotCheck,
} from "./abuse.js";

export const OUTBOX_OPERATIONS_PATH = "/api/internal/lead-outbox";
export const PROTECTION_PATH = "/api/protection";

export const LEAD_BODY_LIMIT_BYTES = 12_000;

/**
 * Lead forms: rate limit, then read the body ONCE within the size limit (413 when larger, chunked
 * bodies included), then honeypot and (when configured) Turnstile. Returns a Response to stop, or
 * { request } — a rebuilt request carrying the already-read bytes for the delivery handler, so the
 * original stream is never cloned or buffered past the limit.
 */
export async function guardLeadSubmission(request, env, fetchImpl, maxBytes = LEAD_BODY_LIMIT_BYTES) {
  if (request.method !== "POST") return { request };
  const limit = await checkRateLimit(request, env, "lead");
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);
  let text;
  try {
    text = await readBoundedText(request, maxBytes);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return json({ ready: false, code: "request_too_large" }, 413);
    return json({ ready: false, code: "invalid_request" }, 400);
  }
  const rebuilt = new Request(request.url, { method: request.method, headers: request.headers, body: text });
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { request: rebuilt }; // The delivery handler reports invalid JSON with its own code.
  }
  if (honeypotTripped(payload)) return json({ ready: false, code: "request_rejected" }, 400);
  const botCheck = await verifyBotCheck(request, env, payload?.botCheck, fetchImpl);
  if (!botCheck.ok) return json({ ready: false, code: botCheck.code }, 403);
  return { request: rebuilt };
}

// Voice sessions spend provider minutes; public voice requires a configured bot check.
export async function guardVoiceSession(request, env, config, fetchImpl) {
  const pathname = new URL(request.url).pathname;
  if (pathname === VOICE_PATHS.status) return null;
  const limit = await checkRateLimit(request, env, pathname === VOICE_PATHS.files ? "files" : "voice");
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);
  const publicVoice = config?.voice?.public === true && env.ELEVENLABS_VOICE_PUBLIC === "true";
  if (publicVoice && pathname !== VOICE_PATHS.files) {
    if (!turnstileConfigured(env)) return json({ ready: false, code: "bot_protection_not_configured" }, 503);
    const botCheck = await verifyBotCheck(request, env, null, fetchImpl);
    if (!botCheck.ok) return json({ ready: false, code: botCheck.code }, 403);
  }
  return null;
}

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

  let lastOpportunisticDrain = 0;
  // Hosts without cron still retry queued leads: at most once a minute per isolate, after the
  // response is sent.
  function scheduleOpportunisticDrain(env, ctx) {
    if (typeof ctx?.waitUntil !== "function" || Date.now() - lastOpportunisticDrain < 60_000) return;
    lastOpportunisticDrain = Date.now();
    ctx.waitUntil(growthos.scheduledDrain(env, outboundFetch).catch(() => null));
  }

  async function fetchHandler(request, rawEnv, ctx) {
    const env = normalizeEnv(await resolveSecretBindings(rawEnv));
    const pathname = new URL(request.url).pathname;
    if (pathname === OUTBOX_OPERATIONS_PATH)
      return growthos.handleOutboxOperations(request, env, outboundFetch);
    if (pathname.startsWith("/api/")) scheduleOpportunisticDrain(env, ctx);
    if (pathname === PROTECTION_PATH) return json({ ready: true, ...publicProtectionSettings(env) });
    if (leadPaths.has(pathname)) {
      const guarded = await guardLeadSubmission(request, env, outboundFetch);
      if (guarded instanceof Response) return guarded;
      request = guarded.request;
      // GrowthOS connected (env flag or config intent) => every form goes to GrowthOS
      // and the email bridge cannot run.
      if (growthOSOwnsLeadAutomations(env, config) || config?.emailBridge?.enabled !== true)
        return growthos.handleLead(request, env, outboundFetch);
      return handleEmailBridgeLead(request, env, config, outboundFetch);
    }
    if (pathname.startsWith("/api/acquisition/")) {
      if (request.method === "POST") {
        const limit = await checkRateLimit(request, env, "measurement");
        if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);
      }
      return growthos.handleAcquisition(request, env, outboundFetch);
    }
    if (
      pathname === VOICE_PATHS.status ||
      pathname === VOICE_PATHS.session ||
      pathname === VOICE_PATHS.token
    ) {
      if (!voiceEnabled) return json({ ready: false, code: "voice_disabled" }, 404);
      return (await guardVoiceSession(request, env, config, outboundFetch)) ?? handleVoiceSessionRequest(request, env, config, outboundFetch);
    }
    if (pathname === VOICE_PATHS.files) {
      if (!voiceEnabled) return json({ ready: false, code: "voice_disabled" }, 404);
      return (await guardVoiceSession(request, env, config, outboundFetch)) ?? handleVoiceFileRequest(request, env, config, outboundFetch);
    }
    if (pathname === WEATHER_EVIDENCE_PATH) {
      if (!weatherEnabled) return json({ ready: false, code: "module_disabled" }, 404);
      const limit = await checkRateLimit(request, env, "weather");
      if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);
      return handleWeatherEvidenceRequest(request, outboundFetch);
    }
    // Unknown API routes never fall through to an HTML shell.
    if (pathname === "/api" || pathname.startsWith("/api/"))
      return json({ code: "not_found" }, 404);
    return serveAsset(request, env, assetMode);
  }

  async function scheduled(_event, rawEnv, ctx) {
    const work = resolveSecretBindings(rawEnv)
      .then((env) => growthos.scheduledDrain(normalizeEnv(env), outboundFetch))
      .catch(() => ({ skipped: "drain_failed" }));
    if (ctx?.waitUntil) ctx.waitUntil(work);
    return work;
  }

  return { fetch: fetchHandler, scheduled };
}
