// Public, display-safe facts for the browser, the prerenderer and tests. Everything here comes
// from the sanitized subset in publicConfig.js (see the css-public-config Vite plugin).
import pub from "./publicConfig.js";

export const BRAND_NAME = pub.brandName;
export const PHONE_DISPLAY = pub.phone.display;
export const PHONE_E164 = pub.phone.e164;
export const PHONE_LINK = `tel:${PHONE_E164}`;
export const SERVICE_AREA = pub.serviceArea;
export const HOURS_CONFIRMED = pub.hours.confirmed;
export const HOURS_TEXT = pub.hours.text;
export const HOURS_FALLBACK = "Call for current office hours";
export const LICENSE_NUMBER = pub.license;
export const LOCATION = pub.location;
export const TIMEZONE = pub.timezone;
export const SITE_ORIGIN = pub.origin;
export const TENANT_KEY = pub.tenantKey;
export const SOURCE_KEY = pub.sourceKey;
export const FORMS = pub.forms;
export const MAINTENANCE = pub.maintenance;

// The plan cards lead with one figure: visits in a year. It is worked out from the approved
// cadence wording, so a cadence this table does not know simply shows no figure (and a test
// fails, so the table gets updated rather than guessed).
const VISITS_A_YEAR = { "One visit every six months": 2, "Quarterly visits": 4 };
/** Visits in a year for an approved plan cadence, or null when it is not a known cadence. */
export const visitsAYear = (cadence) => VISITS_A_YEAR[cadence] ?? null;

/** Consent text exactly as configured for a form (what the worker records the policy for). */
export const consentTextFor = (formId) => FORMS[formId]?.consentText ?? "";

/**
 * Live "office open now" status. Only available once hours are confirmed AND a structured
 * schedule exists; otherwise null so the UI shows the neutral fallback.
 * schedule: one { days: ["Mon", ...], open: "HH:MM", close: "HH:MM" } block, or an array of them.
 */
export function officeStatus(now = new Date(), schedule = pub.hours.schedule, confirmed = HOURS_CONFIRMED) {
  if (!confirmed || !schedule) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const open = [schedule].flat().some((b) => b.days.includes(parts.weekday) && minutes >= toMinutes(b.open) && minutes < toMinutes(b.close));
  return open ? "office-open" : "office-closed";
}
