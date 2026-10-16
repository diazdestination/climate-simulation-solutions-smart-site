// Abuse protection for public endpoints that spend money or create leads: a hidden honeypot
// field, per-client rate limits, and Cloudflare Turnstile when its secret is configured.
// Client addresses are hashed before storage and counters expire with their window.

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Fixed windows per route. Generous for real visitors, tight enough to cap bot spend.
export const RATE_LIMITS = {
  lead: [{ limit: 5, windowSeconds: 600 }, { limit: 20, windowSeconds: 86_400 }],
  voice: [{ limit: 4, windowSeconds: 600 }, { limit: 10, windowSeconds: 86_400 }],
  files: [{ limit: 12, windowSeconds: 600 }],
  weather: [{ limit: 10, windowSeconds: 600 }],
  measurement: [{ limit: 120, windowSeconds: 600 }],
};

const memoryCounters = new Map();

export function clientAddress(request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || forwarded || "unknown";
}

async function sha256Hex(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function memoryHit(bucket, expiresAt, now) {
  const current = memoryCounters.get(bucket);
  if (!current || current.expiresAt <= now) {
    memoryCounters.set(bucket, { hits: 1, expiresAt });
    if (memoryCounters.size > 5_000) {
      for (const [key, value] of memoryCounters) if (value.expiresAt <= now) memoryCounters.delete(key);
    }
    return 1;
  }
  current.hits += 1;
  return current.hits;
}

async function storedHit(db, bucket, expiresAt, now) {
  const row = await db
    .prepare(
      `INSERT INTO request_rate_limits (bucket, hits, expires_at) VALUES (?, 1, ?)
       ON CONFLICT(bucket) DO UPDATE SET hits = request_rate_limits.hits + 1
       RETURNING hits`,
    )
    .bind(bucket, expiresAt)
    .first();
  if (Math.random() < 0.02) {
    await db.prepare("DELETE FROM request_rate_limits WHERE expires_at <= ?").bind(now).run();
  }
  return Number(row?.hits ?? 1);
}

/**
 * Counts this request against every window for the route. Uses D1 when the binding exists,
 * otherwise a per-isolate memory counter (local previews and tests). Storage failures fall back
 * to memory rather than blocking a real customer.
 */
export async function checkRateLimit(request, env, route, now = Date.now()) {
  const windows = RATE_LIMITS[route];
  if (!windows) throw new Error(`unknown_rate_limit_route:${route}`);
  const address = clientAddress(request);
  // Without a client address every visitor would share one bucket and real customers would be
  // blocked together. Turnstile and provider-side caps still apply in that case.
  if (address === "unknown") return { allowed: true, unattributed: true };
  const salt = env.SITE_RATE_LIMIT_SALT || "smart-site-rate-limit-v1";
  const client = await sha256Hex(`${salt}:${address}`);
  for (const { limit, windowSeconds } of windows) {
    const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
    const expiresAt = (windowStart + windowSeconds) * 1000;
    const bucket = `${route}:${windowSeconds}:${windowStart}:${client.slice(0, 32)}`;
    let hits;
    try {
      hits = env.DB ? await storedHit(env.DB, bucket, expiresAt, now) : memoryHit(bucket, expiresAt, now);
    } catch {
      hits = memoryHit(bucket, expiresAt, now);
    }
    if (hits > limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1000)) };
    }
  }
  return { allowed: true };
}

export function resetMemoryRateLimits() {
  memoryCounters.clear();
}

/** A filled hidden field means an automated submission. */
export function honeypotTripped(payload) {
  const value = payload?.website ?? payload?.botField;
  return typeof value === "string" && value.trim().length > 0;
}

export function turnstileConfigured(env) {
  return Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY);
}

/** Public, non-secret settings the browser needs to render the bot check. */
export function publicProtectionSettings(env) {
  return { turnstileSiteKey: turnstileConfigured(env) ? env.TURNSTILE_SITE_KEY : null };
}

/**
 * Verifies a Turnstile token when Turnstile is configured. Returns { ok, code }.
 * Not configured → ok (local previews); configured but missing/invalid → not ok.
 */
export async function verifyBotCheck(request, env, token, fetchImpl = fetch) {
  if (!turnstileConfigured(env)) return { ok: true, code: "bot_check_not_configured" };
  const response = String(token ?? request.headers.get("x-bot-check") ?? "").trim();
  if (!response || response.length > 2048) return { ok: false, code: "bot_check_required" };
  try {
    const body = new FormData();
    body.append("secret", env.TURNSTILE_SECRET_KEY);
    body.append("response", response);
    const address = clientAddress(request);
    if (address !== "unknown") body.append("remoteip", address);
    const result = await fetchImpl(TURNSTILE_VERIFY_URL, { method: "POST", body });
    const payload = await result.json();
    return payload?.success === true ? { ok: true, code: "bot_check_passed" } : { ok: false, code: "bot_check_failed" };
  } catch {
    return { ok: false, code: "bot_check_unavailable" };
  }
}

export function tooManyRequests(retryAfterSeconds) {
  return new Response(JSON.stringify({ ready: false, code: "rate_limited" }), {
    status: 429,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "retry-after": String(retryAfterSeconds),
    },
  });
}
