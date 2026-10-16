// HVAC request vocabulary and the structured project summary sent to GrowthOS.
//
// GrowthOS has no first-class HVAC fields yet (smart-site intake carries serviceCode, timing,
// address and a free-text summary). Issue type, equipment, plan interest and preferred times
// therefore travel as a labeled, line-based summary that staff can read and a later GrowthOS
// parser can split on "Label: value". Pure module (browser + node tests).
import { TENANT_KEY, SOURCE_KEY } from "./siteFacts.js";

export const URGENT_ISSUES = [
  { id: "no-heat", label: "No heat", detail: "The heat is not coming on or the house is getting cold.", serviceCode: "repair" },
  { id: "no-cooling", label: "No AC / no cooling", detail: "The air conditioning is not cooling or will not turn on.", serviceCode: "repair" },
  { id: "water-leak", label: "Water leaking from the system", detail: "Water around the indoor unit, air handler, furnace or drain line.", serviceCode: "repair" },
  { id: "noise-and-failure", label: "Unusual noise and not heating or cooling", detail: "New loud or unusual sounds together with the system not working.", serviceCode: "repair" },
  { id: "other-urgent", label: "Something else urgent", detail: "Another heating or cooling problem that cannot wait.", serviceCode: "not-sure" },
];

export const SERVICE_ISSUES = [
  { id: "not-heating", label: "Not heating properly", serviceCode: "repair", urgentHint: true },
  { id: "not-cooling", label: "Not cooling properly", serviceCode: "repair", urgentHint: true },
  { id: "performance", label: "Uneven comfort, cycling or unusual operation", serviceCode: "repair" },
  { id: "thermostat", label: "Thermostat or controls", serviceCode: "repair" },
  { id: "maintenance", label: "Maintenance / tune-up visit", serviceCode: "maintenance" },
  { id: "replacement", label: "Replace an existing system", serviceCode: "replacement" },
  { id: "new-installation", label: "New installation", serviceCode: "new-installation" },
  { id: "refrigeration", label: "Commercial refrigeration", serviceCode: "not-sure" },
  { id: "not-sure", label: "Not sure / something else", serviceCode: "not-sure" },
];

export const SYSTEM_TYPES = [
  ["", "Choose if known"],
  ["central-ac-furnace", "Central AC with a furnace"],
  ["heat-pump", "Heat pump"],
  ["furnace", "Furnace only"],
  ["central-ac", "Central AC only"],
  ["ductless", "Ductless mini-split"],
  ["packaged", "Packaged unit"],
  ["refrigeration", "Commercial refrigeration equipment"],
  ["not-sure", "Not sure"],
];

export const SYSTEM_AGES = [
  ["", "Choose if known"],
  ["under-5", "Under 5 years"],
  ["5-10", "5–10 years"],
  ["10-15", "10–15 years"],
  ["over-15", "Over 15 years"],
  ["not-sure", "Not sure"],
];

export const PROPERTY_TYPES = [
  ["residential", "Home"],
  ["commercial", "Business / commercial property"],
];

export const PREFERRED_WINDOWS = [
  ["weekday-morning", "Weekday morning"],
  ["weekday-midday", "Weekday midday"],
  ["weekday-afternoon", "Weekday afternoon"],
  ["first-available", "First available"],
];

export const SERVICE_TIMING = [
  ["not-sure", "Not sure yet"],
  ["as-soon-as-possible", "As soon as possible"],
  ["this-week", "This week"],
  ["flexible", "Flexible / planning ahead"],
];

export const ESTIMATE_TOPICS = [
  ["replacement", "System replacement"],
  ["new-installation", "New installation"],
  ["repair", "Repair"],
  ["maintenance", "Maintenance"],
  ["not-sure", "Not sure"],
];

export const ESTIMATE_QUESTIONS = [
  ["scope", "What the estimate includes"],
  ["options", "Equipment or option choices"],
  ["scheduling", "When the work could be scheduled"],
  ["ready", "I’d like to talk about moving forward"],
  ["other", "Something else"],
];

export const ESTIMATE_TIMING = [
  ["not-sure", "Not sure"],
  ["ready-to-talk", "Ready to talk soon"],
  ["still-deciding", "Still deciding"],
];

const labelOf = (list, id) => {
  const hit = list.find((item) => (Array.isArray(item) ? item[0] === id : item.id === id));
  return hit ? (Array.isArray(hit) ? hit[1] : hit.label) : "";
};

const clean = (value, max = 300) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** "Label: value" lines, blanks omitted, hard-capped below GrowthOS's 2000-char summary limit. */
export function summaryLines(title, pairs, notes) {
  const lines = [title];
  for (const [label, value] of pairs) {
    const text = clean(value);
    if (text) lines.push(`${label}: ${text}`);
  }
  const note = String(notes ?? "").trim();
  if (note) lines.push(`Notes: ${note.slice(0, 1200)}`);
  return lines.join("\n").slice(0, 1990);
}

/** Builds the browser envelope for one of the four CSS forms. */
export function buildLeadRequest(kind, fields, { requestId, analytics } = {}) {
  const f = fields ?? {};
  let formId;
  let serviceCode;
  let urgency;
  let summary;
  if (kind === "urgent") {
    const issue = URGENT_ISSUES.find((i) => i.id === f.issue) ?? URGENT_ISSUES.at(-1);
    formId = "urgent-request";
    serviceCode = issue.serviceCode;
    urgency = issue.id; // mapped to GrowthOS timing "urgent" by config.growthos.timingMap
    summary = summaryLines(
      "[CSS website] URGENT request (no heat / no AC / water leak triage)",
      [
        ["Request type", "Urgent service"],
        ["Issue", issue.label],
        ["Safety screen", "Visitor reported no gas smell, no CO alarm and no burning/electrical smell or smoke"],
        ["Property", labelOf(PROPERTY_TYPES, f.propertyType)],
        ["System type", labelOf(SYSTEM_TYPES, f.systemType)],
        ["Approx. system age", labelOf(SYSTEM_AGES, f.systemAge)],
        ["Brand", f.brand],
        ["Arrival", "No arrival time was promised by the website"],
      ],
      f.notes,
    );
  } else if (kind === "service") {
    const issue = SERVICE_ISSUES.find((i) => i.id === f.issue) ?? SERVICE_ISSUES.at(-1);
    formId = "service-request";
    serviceCode = issue.serviceCode;
    urgency = f.timing || "not-sure";
    const windows = (f.preferredWindows ?? []).map((w) => labelOf(PREFERRED_WINDOWS, w)).filter(Boolean).join(", ");
    summary = summaryLines(
      "[CSS website] Service call request",
      [
        ["Request type", "Book a service call (request only; office confirms)"],
        ["Issue", issue.label],
        ["Property", labelOf(PROPERTY_TYPES, f.propertyType)],
        ["System type", labelOf(SYSTEM_TYPES, f.systemType)],
        ["Approx. system age", labelOf(SYSTEM_AGES, f.systemAge)],
        ["Brand", f.brand],
        ["Preferred times (request, not confirmed)", [windows, clean(f.preferredDate, 60) && `around ${clean(f.preferredDate, 60)}`].filter(Boolean).join("; ")],
        ["Timing", labelOf(SERVICE_TIMING, f.timing)],
      ],
      f.notes,
    );
  } else if (kind === "maintenance") {
    formId = "maintenance-plan";
    serviceCode = "maintenance";
    urgency = "plan-request";
    const commercial = f.propertyType === "commercial";
    summary = summaryLines(
      "[CSS website] Maintenance plan request",
      [
        ["Request type", "Maintenance plan signup request (not an enrollment or charge)"],
        ["Plan interest", commercial ? "Commercial plan — quarterly visits, billed annually" : "Residential plan — visit every six months, billed annually"],
        ["Property", labelOf(PROPERTY_TYPES, f.propertyType)],
        ["Number of systems", f.systemCount],
        ["System type", labelOf(SYSTEM_TYPES, f.systemType)],
        ["Approx. system age", labelOf(SYSTEM_AGES, f.systemAge)],
        ["Brand", f.brand],
        ["Preferred times (request, not confirmed)", (f.preferredWindows ?? []).map((w) => labelOf(PREFERRED_WINDOWS, w)).filter(Boolean).join(", ")],
      ],
      f.notes,
    );
  } else if (kind === "estimate") {
    formId = "estimate-question";
    serviceCode = ESTIMATE_TOPICS.some(([id]) => id === f.estimateTopic) ? f.estimateTopic : "not-sure";
    urgency = f.timing || "not-sure";
    summary = summaryLines(
      "[CSS website] Question about a received estimate",
      [
        ["Request type", "Estimate follow-up question (does not accept or change the estimate)"],
        ["Estimate for", labelOf(ESTIMATE_TOPICS, serviceCode)],
        ["Estimate received (approx.)", f.estimateDate],
        ["Estimate reference (if known)", clean(f.estimateReference, 40)],
        ["Question about", labelOf(ESTIMATE_QUESTIONS, f.questionType)],
        ["Timing", labelOf(ESTIMATE_TIMING, f.timing)],
      ],
      f.notes,
    );
  } else throw new Error(`unknown request kind: ${kind}`);

  return {
    tenantKey: TENANT_KEY,
    source: SOURCE_KEY,
    formId,
    requestId,
    contact: {
      name: clean(f.name, 100),
      phone: clean(f.phone, 30),
      ...(clean(f.email, 254) ? { email: clean(f.email, 254) } : {}),
    },
    project: {
      serviceCode,
      postalCode: clean(f.zip, 5),
      ...(clean(f.address, 180) ? { address: clean(f.address, 180) } : {}),
      ...(clean(f.city, 100) ? { city: clean(f.city, 100) } : {}),
      ...(clean(f.state, 2) ? { state: clean(f.state, 2).toUpperCase() } : {}),
      summary,
      urgency,
    },
    consent: { contactAuthorized: f.consent === true, analyticsAuthorized: Boolean(analytics) },
    ...(analytics?.attribution ? { attribution: analytics.attribution } : {}),
    ...(analytics?.measurement ? { measurement: analytics.measurement } : {}),
  };
}
