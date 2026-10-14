// Site -> GrowthOS smart-site intake connector. Parameterized port of the Painless
// reference adapter (worker/growthos.js). Everything client-specific (tenant, source,
// service codes, timing vocabulary, consent policy versions and channels per form)
// comes from site config; credentials come only from server env.
//
// Contract (see kit/growthos-integration-contract.md):
//   POST {origin}/api/v1/public/smart-sites/{siteId}/intake, Bearer ss_<64 hex>
//   "saved" only when GrowthOS returns status:"saved" + UUID leadId + UUID receiptId.
import { normalizeEnv } from "./env.js";
import {
  UUID,
  json,
  fetchSignalOptions,
  isLoopbackHostname,
  isCrossSite,
  readBoundedJson,
  readBoundedText,
  safeResponseJson,
  BodyTooLargeError,
} from "./http.js";
import {
  outboxConfigured,
  enqueueInquiry,
  deliverOutboxRow,
  publicOutboxResult,
  drainOutbox,
  authorizeDrain,
  outboxSummary,
} from "./lead-outbox.js";

export const GROWTHOS_PRODUCTION_ORIGIN = "https://app.mogulforge.ai";
export const TIMING_VALUES = ["urgent", "soon", "planning", "unsure"];
export const CONSENT_CHANNELS = ["phone", "email", "sms"];

const ACQUISITION_PATHS = {
  "/api/acquisition/status": "acquisition-status",
  "/api/acquisition/events": "acquisition-events",
  "/api/acquisition/opt-out": "analytics-opt-out",
};
const AUTOMATION_AGENT =
  /(?:bot|crawler|spider|slurp|headless|lighthouse|pagespeed|uptime|monitor)/i;

/**
 * When GrowthOS is connected it owns lead storage, staff alerts and any customer
 * follow-up. The site's own email bridge, SMS or autoresponders must then stay off so
 * nothing is alerted or sent twice. Config intent (growthos.enabled) is enough to turn
 * site-side automations off; actually delivering to GrowthOS additionally requires the
 * env flag and credentials (fail closed).
 */
export function growthOSOwnsLeadAutomations(rawEnv, siteConfig) {
  const env = normalizeEnv(rawEnv);
  return (
    env.SMART_SITE_GROWTHOS_ENABLED === "true" ||
    siteConfig?.growthos?.enabled === true
  );
}

function stayedOnConfiguredOrigin(response, origin) {
  if (response.redirected) return false;
  if (!response.url) return true;
  try {
    return new URL(response.url).origin === origin;
  } catch {
    return false;
  }
}

/** Fixed origin pin + credential shape. `localRequest` allows an http loopback GrowthOS only from a loopback preview. */
export function resolveGrowthOSConnection(
  rawEnv,
  { localRequest = false, pinnedOrigin = GROWTHOS_PRODUCTION_ORIGIN } = {},
) {
  const env = normalizeEnv(rawEnv);
  let origin;
  try {
    const url = new URL(env.GROWTHOS_API_ORIGIN);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    const localTarget = isLoopbackHostname(url.hostname);
    if (
      !(url.protocol === "https:" && url.origin === pinnedOrigin) &&
      !(localRequest && localTarget && url.protocol === "http:")
    )
      return null;
    origin = url.origin;
  } catch {
    return null;
  }
  if (
    env.SMART_SITE_GROWTHOS_ENABLED !== "true" ||
    !UUID.test(env.GROWTHOS_SITE_ID ?? "") ||
    !/^ss_[a-f0-9]{64}$/.test(env.GROWTHOS_SITE_SECRET ?? "")
  )
    return null;
  return {
    origin,
    siteId: env.GROWTHOS_SITE_ID,
    secret: env.GROWTHOS_SITE_SECRET,
  };
}

function connectorSettings(siteConfig) {
  const g = siteConfig?.growthos ?? {};
  if (!g.tenantKey || !g.sourceKey) throw new Error("growthos_config_invalid");
  const smsApproved = siteConfig?.sms?.compliantConsentApproved === true;
  return {
    tenantKey: g.tenantKey,
    sourceKey: g.sourceKey,
    serviceCodes: new Set(g.serviceCodes ?? []),
    forms: g.forms ?? {},
    defaultFormId: g.defaultFormId ?? Object.keys(g.forms ?? {})[0],
    timingMap: g.timingMap ?? {},
    pinnedOrigin: g.apiOrigin ?? GROWTHOS_PRODUCTION_ORIGIN,
    requireOriginHeader: g.requireOriginHeader === true,
    maxRequestBytes: g.maxRequestBytes ?? 12_000,
    timeoutMs: g.timeoutMs ?? 10_000,
    codePrefix: g.codePrefix ?? "growthos",
    smsApproved,
  };
}

/**
 * Neutral browser envelope:
 * { tenantKey, source, formId, requestId,
 *   contact: { name, phone, email },
 *   project: { serviceCode, postalCode, address, city, state, summary, timing | urgency },
 *   consent: { contactAuthorized, analyticsAuthorized },
 *   attribution?, measurement? }
 */
export function buildGrowthOSIntake(payload, siteConfig) {
  const s = connectorSettings(siteConfig);
  if (payload?.tenantKey !== s.tenantKey || payload?.source !== s.sourceKey)
    throw new Error("lead_source_invalid");
  if (!UUID.test(payload?.requestId ?? ""))
    throw new Error("request_id_required");
  if (payload?.consent?.contactAuthorized !== true)
    throw new Error("contact_consent_required");
  const formId = payload?.formId ?? s.defaultFormId;
  const form = Object.hasOwn(s.forms, formId) ? s.forms[formId] : null;
  if (!form) throw new Error("form_invalid");
  const serviceCode = payload?.project?.serviceCode;
  const formServices = form.serviceCodes ? new Set(form.serviceCodes) : null;
  if (!s.serviceCodes.has(serviceCode) || (formServices && !formServices.has(serviceCode)))
    throw new Error("service_invalid");
  const name = String(payload?.contact?.name ?? "").trim();
  const phone = String(payload?.contact?.phone ?? "").trim();
  const email = String(payload?.contact?.email ?? "")
    .trim()
    .toLowerCase();
  const postalCode = String(payload?.project?.postalCode ?? "").trim();
  const address = String(payload?.project?.address ?? "").trim();
  const city = String(payload?.project?.city ?? "").trim();
  const state = String(payload?.project?.state ?? "").trim().toUpperCase();
  const summary = String(payload?.project?.summary ?? "").trim();
  if (name.length < 2 || name.length > 100) throw new Error("name_invalid");
  const requirePhone = form.requirePhone !== false;
  if (phone || requirePhone) {
    if (
      !/^\+?[0-9 ()-]{10,30}$/.test(phone) ||
      phone.replace(/\D/g, "").length < 10
    )
      throw new Error("phone_invalid");
  }
  if (
    email &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
  )
    throw new Error("email_invalid");
  if (!phone && !email) throw new Error("contact_required");
  const requirePostal = form.requirePostalCode !== false;
  if ((postalCode || requirePostal) && !/^\d{5}$/.test(postalCode))
    throw new Error("zip_invalid");
  if (state && !/^[A-Z]{2}$/.test(state)) throw new Error("state_invalid");
  if (address.length > 180 || city.length > 100 || summary.length > 2000)
    throw new Error("details_too_long");
  const rawTiming = payload?.project?.timing;
  const mapped = s.timingMap?.[formId]?.[payload?.project?.urgency];
  const timing = rawTiming || mapped || "unsure";
  if (!TIMING_VALUES.includes(timing)) throw new Error("timing_invalid");
  // Channels come from reviewed config, never from the browser. A channel is only
  // claimed when the visitor actually supplied that contact route. SMS is dropped
  // unless compliant SMS consent was approved for this site.
  const channels = (form.channels ?? []).filter(
    (c) =>
      CONSENT_CHANNELS.includes(c) &&
      (c !== "sms" || s.smsApproved) &&
      (c === "email" ? Boolean(email) : Boolean(phone)),
  );
  const analytics = payload?.consent?.analyticsAuthorized === true;
  const attribution = {};
  let measurement;
  if (analytics) {
    for (const field of ["source", "medium", "campaign"]) {
      const value = payload?.attribution?.[field];
      if (typeof value === "string" && /^[a-zA-Z0-9_. -]{1,100}$/.test(value))
        attribution[field] = value;
    }
    const path = payload?.attribution?.landingPath;
    if (typeof path === "string" && /^\/[a-zA-Z0-9/_-]{0,199}$/.test(path))
      attribution.landingPath = path;
    const host = payload?.attribution?.referrerHost;
    if (typeof host === "string" && /^[a-zA-Z0-9.-]{1,200}$/.test(host))
      attribution.referrerHost = host;
    if (payload?.measurement !== undefined) {
      const visitorId = payload?.measurement?.visitorId;
      const sessionId = payload?.measurement?.sessionId;
      const policyVersion = payload?.measurement?.policyVersion;
      if (
        !UUID.test(visitorId ?? "") ||
        (sessionId !== undefined && !UUID.test(sessionId ?? "")) ||
        typeof policyVersion !== "string" ||
        !/^[a-zA-Z0-9._-]{1,80}$/.test(policyVersion)
      )
        throw new Error("measurement_invalid");
      measurement = {
        visitorId,
        ...(sessionId ? { sessionId } : {}),
        policyVersion,
      };
    }
  }
  return {
    schemaVersion: 1,
    requestId: payload.requestId,
    contact: { name, ...(phone ? { phone } : {}), ...(email ? { email } : {}) },
    project: {
      serviceCode,
      ...(postalCode ? { postalCode } : {}),
      timing,
      ...(address ? { address } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(summary ? { summary } : {}),
    },
    consent: {
      contact: true,
      policyVersion: form.policyVersion,
      analytics,
      channels,
    },
    ...(analytics ? { attribution } : {}),
    ...(measurement ? { measurement } : {}),
  };
}

export function createGrowthOSConnector(siteConfig) {
  const s = connectorSettings(siteConfig);
  const code = (suffix) => `${s.codePrefix}_${suffix}`;
  const publicForms = Object.fromEntries(
    Object.entries(s.forms).map(([id, f]) => [
      id,
      {
        policyVersion: f.policyVersion,
        consentText: f.consentText,
        channels: (f.channels ?? []).filter((c) => c !== "sms" || s.smsApproved),
      },
    ]),
  );

  // Optional host pin (CSS adapter behavior): when SITE_PUBLIC_ORIGIN is set, only requests
  // addressed to that exact origin may use the connection.
  function configuration(request, rawEnv) {
    const env = normalizeEnv(rawEnv);
    if (env.SITE_PUBLIC_ORIGIN && new URL(request.url).origin !== env.SITE_PUBLIC_ORIGIN) return null;
    return resolveGrowthOSConnection(env, {
      localRequest: isLoopbackHostname(new URL(request.url).hostname),
      pinnedOrigin: s.pinnedOrigin,
    });
  }

  async function handleLead(request, rawEnv, fetchImpl = fetch) {
    const env = normalizeEnv(rawEnv);
    const config = configuration(request, env);
    const durable = env.SITE_OUTBOX_ENABLED === "true";
    const ready = Boolean(config) && (!durable || outboxConfigured(env));
    if (request.method === "GET")
      return json({
        ready,
        durableRecovery: ready && durable,
        mode: "growthos",
        customerConfirmationEnabled: false,
        code: ready ? code("ready") : code("not_configured"),
        // Reviewed disclosure + policy per form, so the browser shows exactly what is recorded.
        ...(ready ? { forms: publicForms } : {}),
      });
    if (request.method !== "POST")
      return json({ code: "method_not_allowed" }, 405, { allow: "GET, POST" });
    if (isCrossSite(request, { requireOriginHeader: s.requireOriginHeader }))
      return json({ code: "cross_site_request_rejected" }, 403);
    let input;
    try {
      input = buildGrowthOSIntake(
        await readBoundedJson(request, s.maxRequestBytes),
        siteConfig,
      );
    } catch (error) {
      if (error instanceof BodyTooLargeError)
        return json({ code: "request_too_large" }, 413);
      return json(
        {
          code:
            error instanceof SyntaxError
              ? "invalid_json"
              : error.message || "invalid_request",
        },
        400,
      );
    }
    if (!config) return json({ ready: false, code: code("not_configured") }, 503);
    if (durable) {
      if (!outboxConfigured(env))
        return json({ code: "outbox_unavailable" }, 503);
      try {
        const row = await enqueueInquiry(env, config, input);
        // A failed delivery or lost acknowledgement leaves a durable, retryable record.
        try {
          await deliverOutboxRow(env, config, row.id, fetchImpl);
        } catch {
          /* Durable row already committed. */
        }
        const current = await env.DB.prepare(
          "SELECT * FROM lead_outbox WHERE id = ?",
        )
          .bind(row.id)
          .first();
        return json(
          publicOutboxResult(current, row.reused),
          current.state === "delivered" ? 200 : 202,
        );
      } catch (error) {
        const conflict = error.message === "idempotency_conflict";
        return json(
          { code: conflict ? "idempotency_conflict" : "outbox_unavailable" },
          conflict ? 409 : 503,
        );
      }
    }
    try {
      const response = await fetchImpl(
        `${config.origin}/api/v1/public/smart-sites/${config.siteId}/intake`,
        {
          method: "POST",
          redirect: "error",
          ...fetchSignalOptions(s.timeoutMs),
          headers: {
            authorization: `Bearer ${config.secret}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(input),
        },
      );
      if (!stayedOnConfiguredOrigin(response, config.origin))
        return json({ code: code("delivery_unavailable") }, 502);
      const result = await safeResponseJson(response, 8_000);
      if (
        !response.ok ||
        result?.status !== "saved" ||
        !UUID.test(result.leadId ?? "") ||
        !UUID.test(result.receiptId ?? "")
      )
        return json(
          { code: code("delivery_unavailable") },
          response.status === 429 ? 429 : 502,
        );
      return json(
        {
          ready: true,
          status: "saved",
          leadId: result.leadId,
          reference: result.receiptId,
          duplicate: result.duplicate === true,
          confirmationSent: false,
        },
        result.duplicate ? 200 : 201,
      );
    } catch {
      return json({ code: code("delivery_unavailable") }, 502);
    }
  }

  /** Same-origin browser facade; the site credential stays server-side. */
  async function handleAcquisition(request, rawEnv, fetchImpl = fetch) {
    const env = normalizeEnv(rawEnv);
    const pathname = new URL(request.url).pathname;
    const target = ACQUISITION_PATHS[pathname];
    if (!target) return json({ code: "not_found" }, 404);
    const isStatus = pathname === "/api/acquisition/status";
    const isOptOut = pathname === "/api/acquisition/opt-out";
    if (
      (isStatus && request.method !== "GET") ||
      (!isStatus && request.method !== "POST")
    )
      return json({ code: "method_not_allowed" }, 405);
    if (isCrossSite(request))
      return json({ code: "cross_site_request_rejected" }, 403);
    const config = configuration(request, env);
    if (!config)
      return json(
        { ready: false, code: code("not_configured") },
        isStatus ? 200 : 503,
      );
    if (
      !isStatus &&
      !isOptOut &&
      AUTOMATION_AGENT.test(request.headers.get("user-agent") ?? "")
    )
      return json(
        { accepted: 0, duplicates: 0, filtered: "automation-agent" },
        202,
      );
    let body;
    if (!isStatus) {
      try {
        body = await readBoundedText(request, 20_000);
        JSON.parse(body);
      } catch (error) {
        if (error instanceof BodyTooLargeError)
          return json({ code: "request_too_large" }, 413);
        return json({ code: "invalid_json" }, 400);
      }
    }
    const unavailable = isStatus
      ? code("measurement_unavailable")
      : code("measurement_delivery_unavailable");
    try {
      const response = await fetchImpl(
        `${config.origin}/api/v1/public/smart-sites/${config.siteId}/${target}`,
        {
          method: isStatus ? "GET" : "POST",
          redirect: "error",
          ...fetchSignalOptions(8_000),
          headers: {
            authorization: `Bearer ${config.secret}`,
            accept: "application/json",
            ...(!isStatus ? { "content-type": "application/json" } : {}),
          },
          ...(!isStatus ? { body } : {}),
        },
      );
      if (!stayedOnConfiguredOrigin(response, config.origin))
        return json({ ready: false, code: unavailable }, 503);
      const result = await safeResponseJson(response);
      if (!response.ok || result === null)
        return json(
          {
            ready: false,
            code:
              result?.error === "site_measurement_disabled"
                ? code("measurement_disabled")
                : code("measurement_unavailable"),
          },
          response.status === 429 ? 429 : response.status === 409 ? 409 : 503,
        );
      if (isStatus)
        return json({
          ready: result?.ready === true,
          policyVersion: String(result?.policyVersion ?? ""),
          retentionDays: Number(result?.retentionDays ?? 0),
          contract: result?.contract,
        });
      if (isOptOut)
        return json({
          removedEvents: Number(result?.removedEvents ?? 0),
          unlinkedLeads: Number(result?.unlinkedLeads ?? 0),
          operationalLeadRecordsPreserved:
            result?.operationalLeadRecordsPreserved === true,
        });
      return json(
        {
          accepted: Number(result?.accepted ?? 0),
          duplicates: Number(result?.duplicates ?? 0),
          contract: result?.contract,
        },
        202,
      );
    } catch {
      return json({ ready: false, code: unavailable }, 503);
    }
  }

  async function handleOutboxOperations(request, rawEnv, fetchImpl = fetch) {
    const env = normalizeEnv(rawEnv);
    if (request.method !== "POST")
      return json({ code: "method_not_allowed" }, 405);
    if (!(await authorizeDrain(request, env)))
      return json({ code: "unauthorized" }, 401);
    const config = configuration(request, env);
    if (!config || !outboxConfigured(env))
      return json({ code: "outbox_not_configured" }, 503);
    try {
      const body = await readBoundedText(request, 200);
      const input = body ? JSON.parse(body) : {};
      if (
        Object.keys(input).some(
          (k) => !["retryReference", "inspectOnly"].includes(k),
        ) ||
        (input.retryReference !== undefined &&
          !UUID.test(input.retryReference)) ||
        (input.inspectOnly !== undefined &&
          typeof input.inspectOnly !== "boolean")
      )
        return json({ code: "invalid_request" }, 400);
      if (input.retryReference && !input.inspectOnly) {
        await env.DB.prepare(
          `UPDATE lead_outbox SET state = 'pending', next_attempt_at = ?, last_code = 'operator_retry'
          WHERE id = ? AND site_id = ? AND target_origin = ? AND state = 'review' AND lease_until <= ?`,
        )
          .bind(
            Date.now(),
            input.retryReference,
            config.siteId,
            config.origin,
            Date.now(),
          )
          .run();
      }
      return json(
        input.inspectOnly
          ? await outboxSummary(env, config)
          : await drainOutbox(env, config, fetchImpl),
      );
    } catch (error) {
      if (error instanceof BodyTooLargeError)
        return json({ code: "request_too_large" }, 413);
      return json({ code: "outbox_operation_unavailable" }, 503);
    }
  }

  /** Cron/scheduled drain. No request exists, so only the pinned production origin is accepted. */
  async function scheduledDrain(rawEnv, fetchImpl = fetch) {
    const env = normalizeEnv(rawEnv);
    const config = resolveGrowthOSConnection(env, {
      localRequest: false,
      pinnedOrigin: s.pinnedOrigin,
    });
    if (!config || !outboxConfigured(env)) return { skipped: "outbox_not_configured" };
    return drainOutbox(env, config, fetchImpl);
  }

  return {
    configuration,
    buildIntake: (payload) => buildGrowthOSIntake(payload, siteConfig),
    handleLead,
    handleAcquisition,
    handleOutboxOperations,
    scheduledDrain,
  };
}
