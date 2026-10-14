// Durable, encrypted delivery journal for GrowthOS intake. Ported from the Painless
// reference implementation (worker/lead-outbox.js); behavior is unchanged except:
//  - env names are neutral (SITE_OUTBOX_*); PAINLESS_* aliases are accepted via normalizeEnv
//  - the delivery fetch tolerates runtimes without AbortSignal.timeout
//  - provider receipts are read with a byte bound
// The journal is not a lead store: GrowthOS remains the system of record.
import { normalizeEnv } from "./env.js";
import { UUID, fetchSignalOptions, safeResponseJson } from "./http.js";

const encoder = new TextEncoder();
const MAX_ATTEMPTS = 20;
const LEASE_MS = 60_000;
const MAX_RETAINED = 1000;
const REVIEW_AFTER_MS = 72 * 60 * 60_000;
const REVIEW_STATUSES = [400, 401, 403, 404, 409, 413, 422];
const toBase64 = (bytes) => {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s);
};
const fromBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const digest = async (s) =>
  toBase64(await crypto.subtle.digest("SHA-256", encoder.encode(s)));

export function outboxConfigured(rawEnv) {
  const env = normalizeEnv(rawEnv);
  return (
    env.SITE_OUTBOX_ENABLED === "true" &&
    !!env.DB?.prepare &&
    /^[A-Za-z0-9+/]{43}=$/.test(env.SITE_OUTBOX_ENCRYPTION_KEY ?? "")
  );
}
async function key(env) {
  return crypto.subtle.importKey(
    "raw",
    fromBase64(env.SITE_OUTBOX_ENCRYPTION_KEY),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
function aad(row) {
  return encoder.encode(
    `${row.id}|${row.site_id}|${row.target_origin}|${row.request_id}`,
  );
}
async function encrypt(env, row, input) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(row) },
    await key(env),
    encoder.encode(JSON.stringify(input)),
  );
  return `${toBase64(iv)}.${toBase64(bytes)}`;
}
async function decrypt(env, row) {
  const [iv, data] = row.ciphertext.split(".");
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64(iv), additionalData: aad(row) },
        await key(env),
        fromBase64(data),
      ),
    ),
  );
}

/** Persist before any network call. A request ID is never rebound to another tenant/target. */
export async function enqueueInquiry(rawEnv, config, input, now = Date.now()) {
  const env = normalizeEnv(rawEnv);
  const payloadHash = await digest(JSON.stringify(input));
  const row = {
    id: crypto.randomUUID(),
    site_id: config.siteId,
    target_origin: config.origin,
    request_id: input.requestId,
  };
  const ciphertext = await encrypt(env, row, input);
  // Bound unattended public-form growth. Existing retries remain readable even at capacity.
  await env.DB.prepare(
    `INSERT INTO lead_outbox
    (id, site_id, target_origin, request_id, payload_hash, ciphertext, state, next_attempt_at, created_at)
    SELECT ?, ?, ?, ?, ?, ?, 'pending', ?, ?
    WHERE (SELECT count(*) FROM lead_outbox WHERE site_id = ? AND target_origin = ? AND state != 'delivered') < ${MAX_RETAINED}
    ON CONFLICT(site_id, target_origin, request_id) DO NOTHING`,
  )
    .bind(
      row.id,
      config.siteId,
      config.origin,
      input.requestId,
      payloadHash,
      ciphertext,
      now,
      now,
      config.siteId,
      config.origin,
    )
    .run();
  const saved = await env.DB.prepare(
    `SELECT * FROM lead_outbox WHERE site_id = ? AND target_origin = ? AND request_id = ?`,
  )
    .bind(config.siteId, config.origin, input.requestId)
    .first();
  if (!saved) throw new Error("outbox_capacity_reached");
  if (saved.payload_hash !== payloadHash)
    throw new Error("idempotency_conflict");
  return { ...saved, reused: saved.id !== row.id };
}

export function publicOutboxResult(row, duplicate = false) {
  if (row.state === "delivered")
    return {
      ready: true,
      status: "saved",
      leadId: row.lead_id,
      reference: row.receipt_id,
      recoveryReference: row.id,
      duplicate,
      confirmationSent: false,
    };
  return {
    ready: true,
    status: row.state === "review" ? "needs-review" : "queued",
    reference: row.id,
    confirmationSent: false,
  };
}

/** Leases are fenced: a slow worker cannot overwrite the result of a newer retry. */
export async function deliverOutboxRow(
  rawEnv,
  config,
  id,
  fetchImpl = fetch,
  now = Date.now(),
) {
  const env = normalizeEnv(rawEnv);
  const token = crypto.randomUUID();
  const claim = await env.DB.prepare(
    `UPDATE lead_outbox SET lease_token = ?, lease_until = ?, attempts = attempts + 1
    WHERE id = ? AND site_id = ? AND target_origin = ? AND state = 'pending' AND next_attempt_at <= ? AND lease_until <= ?`,
  )
    .bind(token, now + LEASE_MS, id, config.siteId, config.origin, now, now)
    .run();
  if (!claim.meta.changes) return;
  const row = await env.DB.prepare(
    `SELECT * FROM lead_outbox WHERE id = ? AND lease_token = ?`,
  )
    .bind(id, token)
    .first();
  if (!row) return;
  let code = "network_unavailable";
  let review = false;
  try {
    let input;
    try {
      input = await decrypt(env, row);
    } catch {
      code = "encryption_key_unavailable";
      review = true;
      throw new Error(code);
    }
    const response = await fetchImpl(
      `${config.origin}/api/v1/public/smart-sites/${config.siteId}/intake`,
      {
        method: "POST",
        redirect: "error",
        ...fetchSignalOptions(8_000),
        headers: {
          authorization: `Bearer ${config.secret}`,
          "content-type": "application/json",
          "x-smart-site-received-at": new Date(row.created_at).toISOString(),
        },
        body: JSON.stringify(input),
      },
    );
    code = `upstream_${response.status}`;
    // Only an authenticated real receipt clears the retained contact payload.
    const result = await safeResponseJson(response);
    if (result === null) code = "invalid_receipt";
    if (
      response.ok &&
      result?.status === "saved" &&
      UUID.test(result.leadId ?? "") &&
      UUID.test(result.receiptId ?? "")
    ) {
      await env.DB.prepare(
        `UPDATE lead_outbox SET state = 'delivered', lead_id = ?, receipt_id = ?, ciphertext = NULL,
        delivered_at = ?, last_code = 'saved', lease_until = 0, lease_token = NULL WHERE id = ? AND lease_token = ?`,
      )
        .bind(result.leadId, result.receiptId, now, id, token)
        .run();
      return;
    }
    if (response.ok) code = "invalid_receipt";
    review = REVIEW_STATUSES.includes(response.status);
  } catch {
    /* Never log provider bodies, contact details, tokens or crypto errors. */
  }
  const needsReview =
    review ||
    row.attempts >= MAX_ATTEMPTS ||
    now - row.created_at >= REVIEW_AFTER_MS;
  const delay = Math.min(
    60 * 60_000,
    30_000 * 2 ** Math.min(row.attempts - 1, 7),
  );
  await env.DB.prepare(
    `UPDATE lead_outbox SET state = ?, next_attempt_at = ?, last_code = ?, lease_until = 0,
    lease_token = NULL WHERE id = ? AND lease_token = ?`,
  )
    .bind(needsReview ? "review" : "pending", now + delay, code, id, token)
    .run();
}

export async function drainOutbox(
  rawEnv,
  config,
  fetchImpl = fetch,
  now = Date.now(),
) {
  const env = normalizeEnv(rawEnv);
  if (!outboxConfigured(env) || !config)
    throw new Error("outbox_not_configured");
  const { results } = await env.DB.prepare(
    `SELECT id FROM lead_outbox WHERE site_id = ? AND target_origin = ?
    AND state = 'pending' AND next_attempt_at <= ? AND lease_until <= ? ORDER BY next_attempt_at LIMIT 5`,
  )
    .bind(config.siteId, config.origin, now, now)
    .all();
  for (const row of results)
    await deliverOutboxRow(env, config, row.id, fetchImpl, now);
  return outboxSummary(env, config);
}

export async function outboxSummary(rawEnv, config) {
  const env = normalizeEnv(rawEnv);
  const { results } = await env.DB.prepare(
    `SELECT state, count(*) AS count, min(created_at) AS oldestCreatedAt
    FROM lead_outbox WHERE site_id = ? AND target_origin = ? GROUP BY state`,
  )
    .bind(config.siteId, config.origin)
    .all();
  const attention = await env.DB.prepare(
    `SELECT id AS reference, attempts, last_code AS reason, created_at AS createdAt
    FROM lead_outbox WHERE site_id = ? AND target_origin = ? AND state = 'review' ORDER BY created_at LIMIT 25`,
  )
    .bind(config.siteId, config.origin)
    .all();
  return {
    scope: "configured-site-only",
    states: results,
    attention: attention.results,
  };
}

/** Separate server-only operations key, no cookie auth, no public receipt enumeration. */
export async function authorizeDrain(request, rawEnv) {
  const env = normalizeEnv(rawEnv);
  const configured = env.SITE_OUTBOX_DRAIN_SECRET ?? "";
  const supplied = (request.headers.get("authorization") ?? "").replace(
    /^Bearer /,
    "",
  );
  if (
    !/^[a-f0-9]{64}$/.test(configured) ||
    request.headers.has("origin") ||
    supplied.length !== configured.length
  )
    return false;
  const a = await digest(configured),
    b = await digest(supplied);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
