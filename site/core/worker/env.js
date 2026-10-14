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
