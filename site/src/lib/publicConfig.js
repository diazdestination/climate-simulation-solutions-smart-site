// Display-safe subset of site.config.mjs.
//
// In Node (tests, provisioning, release gate) this module computes the subset at runtime.
// In Vite builds (browser + prerender) the `css-public-config` plugin in vite.config.mjs replaces
// this module with the precomputed JSON, so approver notes, "[CONFIRM" markers, release gates
// and every other internal field of site.config.mjs never reach the browser bundle.
import config from "../../site.config.mjs";

export const CONFIRM_MARKER = /\[CONFIRM/i;
export const isUnconfirmed = (value) => CONFIRM_MARKER.test(typeof value === "string" ? value : JSON.stringify(value ?? ""));

/** Public text for a { value, display, approvedBy } fact: neutral `display` while unconfirmed. */
export function publicFactText(fact) {
  if (!fact) return "";
  if (isUnconfirmed(fact.value) || isUnconfirmed(fact.approvedBy)) return fact.display ?? "";
  return fact.display ?? fact.value;
}

export function toPublicConfig(cfg) {
  const hoursConfirmed = !isUnconfirmed(cfg.hours.summary.value) && !isUnconfirmed(cfg.hours.summary.approvedBy);
  const plans = cfg.site.maintenancePlans;
  return {
    brandName: cfg.brand.name.value,
    phone: { e164: cfg.contact.mainPhone.value, display: cfg.contact.mainPhone.display },
    hours: { confirmed: hoursConfirmed, text: publicFactText(cfg.hours.summary), schedule: hoursConfirmed ? cfg.site.hoursSchedule ?? null : null },
    serviceArea: publicFactText(cfg.serviceArea.summary),
    license: cfg.site.license?.number ?? null,
    location: cfg.site.location,
    timezone: cfg.site.timezone,
    origin: cfg.site.origin,
    tenantKey: cfg.growthos.tenantKey,
    sourceKey: cfg.growthos.sourceKey,
    forms: Object.fromEntries(Object.entries(cfg.growthos.forms).map(([id, f]) => [id, { policyVersion: f.policyVersion, consentText: f.consentText }])),
    maintenance: {
      residential: plans.residential.cadence,
      commercial: plans.commercial.cadence,
      billing: plans.billing.value,
      pricing: plans.pricing ?? null,
    },
  };
}

export default toPublicConfig(config);
