// What the homepage leads with at this time of year. Pure module (browser, prerender, tests).
//
// North Georgia runs heat from roughly November through March and air conditioning from May
// through September; April and October are the mild months between. These are calendar rules of
// thumb for ordering the page, not a forecast: the live outdoor reading (when the site has one)
// is shown separately and never changes the season.
import { TIMEZONE } from "./siteFacts.js";

const BY_MONTH = ["heating", "heating", "heating", "between", "cooling", "cooling", "cooling", "cooling", "cooling", "between", "heating", "heating"];

/** "heating" | "cooling" | "between" for a date, judged in the office's time zone. */
export function seasonFor(date = new Date()) {
  const month = Number(new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, month: "numeric" }).format(date));
  return BY_MONTH[month - 1];
}

export const SEASONS = {
  heating: {
    outside: "Heating season in North Georgia",
    // How much of the season's color the air keeps once the room holds its set point (-1 to 1).
    resting: 0.42,
    // The room starts a little cool and warms to the set point when the page loads.
    room: 66,
    target: 70,
    note: "Furnace or heat pump due for a look? A tune-up visit now is easier than a repair on the coldest night.",
    noteCta: "Request a tune-up visit",
  },
  cooling: {
    outside: "Cooling season in North Georgia",
    resting: -0.42,
    room: 77,
    target: 72,
    note: "AC due for a look? A tune-up visit now is easier than a repair on the hottest afternoon.",
    noteCta: "Request a tune-up visit",
  },
  between: {
    outside: "Mild season in North Georgia",
    resting: 0.2,
    room: 68,
    target: 71,
    note: "Between heating and cooling seasons is the easiest time to get a tune-up visit on the schedule.",
    noteCta: "Request a tune-up visit",
  },
};

export const TARGET_MIN = 60;
export const TARGET_MAX = 80;
export const clampTarget = (value) => Math.min(TARGET_MAX, Math.max(TARGET_MIN, Math.round(value)));

// Touch on the dial. A thumb that lands on the dial while someone scrolls the page must scroll
// the page, not turn the dial, so a touch only becomes a turn once it has clearly moved sideways.
// Up-and-down movement is left to the browser (the dial is `touch-action: pan-y`).
export const TURN_SLOP_PX = 8;
export const TAP_SLOP_PX = 10;
/** Has a touch that moved (dx, dy) pixels since it landed become a deliberate turn of the dial? */
export const startsTurn = (dx, dy) => Math.abs(dx) >= TURN_SLOP_PX && Math.abs(dx) > Math.abs(dy);
/** Did a touch that ended (dx, dy) pixels from where it landed stay put, i.e. was it a tap? */
export const isTap = (dx, dy) => Math.hypot(dx, dy) <= TAP_SLOP_PX;

/** "heating" | "cooling" | "holding": what the system is doing to move the room to the set point. */
export function modeFor(room, target) {
  const gap = target - room;
  if (gap > 0.25) return "heating";
  if (gap < -0.25) return "cooling";
  return "holding";
}

/**
 * Symptom-first choices. Each one lands on the page that already handles that request.
 * The urgent ones come first and carry a tone (warm, cool or water) for their tile; the rest are
 * things a visitor plans, and the homepage lists them as plain rows.
 */
export function triageFor(season) {
  const noHeat = { id: "no-heat", label: "No heat", href: "/urgent/", urgent: true, tone: "warm" };
  const noCooling = { id: "no-cooling", label: "No AC", href: "/urgent/", urgent: true, tone: "cool" };
  const leak = { id: "water-leak", label: "Water leaking", href: "/urgent/", urgent: true, tone: "water" };
  const rest = [
    { id: "maintenance", label: "Tune-up visit", href: "/book-service/?issue=maintenance" },
    { id: "replacement", label: "New system", href: "/book-service/?issue=replacement" },
    { id: "refrigeration", label: "Refrigeration", href: "/book-service/?issue=refrigeration" },
    { id: "estimate", label: "Estimate question", href: "/estimate-follow-up/" },
  ];
  return [...(season === "cooling" ? [noCooling, noHeat] : [noHeat, noCooling]), leak, ...rest];
}
