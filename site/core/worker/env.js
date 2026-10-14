// Canonical, client-neutral env names. Legacy names (e.g. the Painless reference
// implementation's PAINLESS_*) are accepted as aliases so an existing deployment can
// adopt the core without renaming secrets first. A canonical value always wins.

export const DEFAULT_ENV_ALIASES = Object.freeze({
  SMART_SITE_GROWTHOS_ENABLED: ["PAINLESS_GROWTHOS_ENABLED"],
  SITE_OUTBOX_ENABLED: ["PAINLESS_OUTBOX_ENABLED"],
  SITE_OUTBOX_ENCRYPTION_KEY: ["PAINLESS_OUTBOX_ENCRYPTION_KEY"],
  SITE_OUTBOX_DRAIN_SECRET: ["PAINLESS_OUTBOX_DRAIN_SECRET"],
  SITE_OUTBOX_STATUS_URL: ["PAINLESS_OUTBOX_STATUS_URL"],
  SITE_EMAIL_ENABLED: ["PAINLESS_EMAIL_ENABLED"],
  SITE_EMAIL_SENDER: ["PAINLESS_EMAIL_SENDER"],
  SITE_EMAIL_INTERNAL_RECIPIENTS: ["PAINLESS_EMAIL_INTERNAL_RECIPIENTS"],
  SITE_EMAIL_CUSTOMER_CONFIRMATION: ["PAINLESS_EMAIL_CUSTOMER_CONFIRMATION"],
  SITE_RATE_LIMIT_SALT: ["PAINLESS_RATE_LIMIT_SALT"],
});

const NORMALIZED = Symbol.for("smart-site-starter.normalized-env");

// Values that may arrive as Cloudflare Secrets Store bindings ({ get(): Promise<string> })
// instead of plain Worker secrets. Only these names are resolved, so KV/D1/assets bindings
// with their own get() are never touched.
export const SECRET_STORE_NAMES = Object.freeze([
  "TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "RESEND_API_KEY",
  "GROWTHOS_SITE_SECRET",
  "SITE_OUTBOX_ENCRYPTION_KEY",
  "SITE_OUTBOX_DRAIN_SECRET",
  "SITE_RATE_LIMIT_SALT",
  "ELEVENLABS_API_KEY",
]);
const SECRET_TTL_MS = 5 * 60_000;
const secretCache = new WeakMap();

async function readSecretBinding(binding, now) {
  const hit = secretCache.get(binding);
  if (hit && now - hit.at < SECRET_TTL_MS) return hit.value;
  const value = String((await binding.get()) ?? "");
  secretCache.set(binding, { value, at: now });
  return value;
}

// Names whose Secrets Store binding exists but could not be read (or read empty). Enumerable
// symbol, so normalizeEnv's spread carries it along.
export const SECRET_BINDING_FAILURES = Symbol.for("smart-site-starter.secret-binding-failures");

/**
 * Replaces Secrets Store bindings for the names above with their string values (cached per
 * isolate for five minutes). A binding that cannot be read becomes "" AND is recorded in
 * env[SECRET_BINDING_FAILURES]: "configured but unreadable" must never look like "not
 * configured" where that would switch a protection off (see botProtectionUnavailable).
 * Plain string secrets pass through unchanged.
 */
export async function resolveSecretBindings(env = {}, now = Date.now()) {
  const pending = SECRET_STORE_NAMES.filter((name) => typeof env?.[name]?.get === "function");
  if (!pending.length) return env;
  const out = { ...env };
  const failures = new Set();
  await Promise.all(
    pending.map(async (name) => {
      try {
        out[name] = await readSecretBinding(env[name], now);
        if (!out[name]) failures.add(name);
      } catch {
        out[name] = "";
        failures.add(name);
      }
    }),
  );
  // Turnstile bound from a store means "protection intended": the pair must be complete.
  if (pending.some((name) => name.startsWith("TURNSTILE_")))
    for (const name of ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"]) if (!out[name]) failures.add(name);
  out[SECRET_BINDING_FAILURES] = failures;
  return out;
}

/** True when a Turnstile key is bound from a Secrets Store but could not be read: fail closed. */
export function botProtectionUnavailable(env) {
  const failures = env?.[SECRET_BINDING_FAILURES];
  return Boolean(failures?.has("TURNSTILE_SITE_KEY") || failures?.has("TURNSTILE_SECRET_KEY"));
}

/**
 * Returns a shallow copy of env with canonical names filled from the first defined alias.
 * Bindings (DB, ASSETS, ...) are carried over by reference. Idempotent.
 */
export function normalizeEnv(env = {}, aliases = DEFAULT_ENV_ALIASES) {
  if (env?.[NORMALIZED]) return env;
  const out = { ...(env ?? {}) };
  for (const [canonical, legacy] of Object.entries(aliases)) {
    if (out[canonical] !== undefined && out[canonical] !== "") continue;
    for (const name of legacy) {
      if (out[name] !== undefined && out[name] !== "") {
        out[canonical] = out[name];
        break;
      }
    }
  }
  Object.defineProperty(out, NORMALIZED, { value: true, enumerable: false });
  return out;
}
