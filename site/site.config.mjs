// Climate Simulation Solutions (CSS) smart-site config.
//
// Business facts come only from the CSS intake records:
//   C:\Forge\worktrees\climate-hvac-site-v8-source\intake\*.md, evidence\BUSINESS-PROOF.csv
//   C:\Forge\CSS_OWNER_INTAKE_2026-10-09.md (owner interview, Oct 9 2026)
// Anything not approved for public display is either omitted or carries a "[CONFIRM" marker.
// A "[CONFIRM" fact renders its neutral `display` text on the site and in the agent, and the
// release gate (scripts/release-gate.mjs) refuses to publish while any marker remains unless the
// explicit local flag SITE_ALLOW_UNCONFIRMED_FACTS=true is set.
//
// This file contains NO secrets. Credentials live only in the host secret store
// (see docs/env-checklist in the starter and .env.example here).

const BRAND_APPROVAL = { approvedBy: "Adam (owner-confirmed brand, BUSINESS-PROOF CSS-P01)", approvedOn: "2026-09-14" };
const DEMO_APPROVAL = { approvedBy: "Adam (shown on the owner-approved CSS v8 demo)", approvedOn: "2026-10-09" };

export default {
  // ---- Brand -------------------------------------------------------------------------
  brand: {
    name: { value: "Climate Simulation Solutions", ...BRAND_APPROVAL },
    slug: "climate-simulation-solutions",
  },

  // ---- Contact facts (E.164) ---------------------------------------------------------
  // (706) 809-5076 is the existing public business line (BUSINESS-PROOF CSS-P03, all 13 core
  // pages of csshvacga.com, and the CSS v8 demo). Line ownership/portability is not verified.
  // No public business email exists in the intake; owners' direct contacts are NOT published.
  contact: {
    mainPhone: { value: "+17068095076", display: "(706) 809-5076", ...DEMO_APPROVAL },
    // Same line: the intake names no separate emergency or on-call number.
    emergencyPhone: { value: "+17068095076", display: "(706) 809-5076", ...DEMO_APPROVAL },
  },

  // ---- Hours: CONFLICT, do not guess -------------------------------------------------
  // Oct 9 2026 owner interview: Monday-Friday "seven to five".
  // Older intake (OPERATING-PLAN, BUSINESS-PROOF CSS-P05) and the current site: Mon-Fri 9am-5pm.
  hours: {
    summary: {
      value: "[CONFIRM: Mon–Fri 7–5 per Oct 9 interview vs 9–5 per older docs]",
      // Neutral text rendered on the site and in the agent until the owners confirm.
      display: "Please call the office for current office hours",
      approvedBy: "[CONFIRM] owner sign-off pending",
      approvedOn: "2026-10-09",
    },
  },

  serviceArea: {
    summary: {
      value: "Dawsonville, Georgia and surrounding North Georgia communities; call with the service address to confirm availability",
      ...DEMO_APPROVAL,
    },
  },

  // ---- GrowthOS (connected by default) ------------------------------------------------
  growthos: {
    enabled: true,
    // Must match the CSS GrowthOS site record once the operator provisions it.
    tenantKey: "climate-simulation-solutions",
    sourceKey: "climate-simulation-solutions-website",
    profile: "hvac",
    serviceCodes: ["repair", "replacement", "maintenance", "new-installation", "not-sure"],
    leadPaths: ["/api/lead"],
    defaultFormId: "service-request",
    // CSS hardening (apply-to-css-hvac.md step 5): browsers always send Origin.
    requireOriginHeader: true,
    // Phone + email only. No SMS until compliant SMS consent wording exists.
    forms: {
      "urgent-request": {
        policyVersion: "css-urgent-request-draft-2026-10-14",
        channels: ["phone", "email"],
        consentText:
          "By sending this urgent request, I agree that Climate Simulation Solutions may call me, or email me if I gave an email address, about this request. Sending it does not dispatch a technician or confirm an arrival time. This website does not send text messages.",
        serviceCodes: ["repair", "not-sure"],
        requirePhone: true,
        requirePostalCode: true,
      },
      "service-request": {
        policyVersion: "css-service-request-draft-2026-10-14",
        channels: ["phone", "email"],
        consentText:
          "By sending this request, I agree that Climate Simulation Solutions may call me, or email me if I gave an email address, about this request. Preferred times are a request only; the office confirms any appointment. This website does not send text messages.",
        requirePhone: true,
        requirePostalCode: true,
      },
      "maintenance-plan": {
        policyVersion: "css-maintenance-plan-draft-2026-10-14",
        channels: ["phone", "email"],
        consentText:
          "By sending this request, I agree that Climate Simulation Solutions may call me, or email me if I gave an email address, about a maintenance plan. This is not an enrollment or a charge; the office explains plan details and pricing directly. This website does not send text messages.",
        serviceCodes: ["maintenance"],
        requirePhone: true,
        requirePostalCode: true,
      },
      "estimate-question": {
        policyVersion: "css-estimate-question-draft-2026-10-14",
        channels: ["phone", "email"],
        consentText:
          "By sending this question, I agree that Climate Simulation Solutions may call me, or email me if I gave an email address, about my estimate. This does not accept, decline or change an estimate. This website does not send text messages.",
        requirePhone: true,
        requirePostalCode: true,
      },
    },
    // Form vocabulary -> GrowthOS timing. Unknown keys fall back to "unsure".
    timingMap: {
      "urgent-request": {
        "no-heat": "urgent",
        "no-cooling": "urgent",
        "water-leak": "urgent",
        "noise-and-failure": "urgent",
        "other-urgent": "urgent",
      },
      "service-request": {
        "as-soon-as-possible": "soon",
        "this-week": "soon",
        "flexible": "planning",
        "not-sure": "unsure",
      },
      "maintenance-plan": { "plan-request": "planning", "not-sure": "unsure" },
      "estimate-question": { "ready-to-talk": "soon", "still-deciding": "planning", "not-sure": "unsure" },
    },
  },

  sms: { compliantConsentApproved: false },
  emailBridge: { enabled: false },

  // ---- Voice / text assistant (private preview) --------------------------------------
  voice: {
    enabled: true,
    public: false,
    fileUploads: true,
    agent: {
      name: "Climate Simulation Solutions Website Assistant (Preview)",
      language: "en",
      timezone: "America/New_York",
      llm: "gemini-2.5-flash",
      temperature: 0.1,
      maxTokens: 650,
      // sync_case is the registry's service-case tool (no HVAC-specific name exists yet).
      tools: ["sync_case", "show_call_path", "open_written_request"],
      asrKeywords: ["furnace", "heat pump", "air handler", "condenser", "thermostat", "ductwork", "refrigeration", "Dawsonville"],
      limits: { dailyLimit: 25, concurrency: 1, maxDurationSeconds: 900 },
      privacy: { recordVoice: false, retentionDays: 1, deleteTranscriptAndPii: true, deleteAudio: true },
      voiceId: undefined,
    },
  },

  modules: { weatherHail: { enabled: false } },
  assets: { htmlFallback: "route-only" },

  // ---- CSS site-only settings (ignored by the core schema) ---------------------------
  site: {
    origin: "https://csshvacga.com", // [CONFIRM] final production domain; canonical URLs only
    location: { city: "Dawsonville", state: "GA" },
    timezone: "America/New_York",
    // Structured weekday schedule used for the live "open now" badge. Stays null until
    // hours.summary is confirmed; the site then shows only the neutral fallback.
    hoursSchedule: null,
    // Maintenance plan facts (Oct 9 owner interview). Prices/inclusions are NOT approved.
    maintenancePlans: {
      residential: { cadence: "One visit every six months", approvedBy: "Owner interview (Heather/Nathaniel via Adam)", approvedOn: "2026-10-09" },
      commercial: { cadence: "Quarterly visits", approvedBy: "Owner interview (Heather/Nathaniel via Adam)", approvedOn: "2026-10-09" },
      billing: { value: "Billed annually", approvedBy: "Owner interview (Heather/Nathaniel via Adam)", approvedOn: "2026-10-09" },
      pricing: null, // "pricing provided by the office" until approved
    },
    // Release gates that are not single facts. status "approved" requires approvedBy/approvedOn.
    releaseGates: [
      { id: "hours", status: "unconfirmed", note: "[CONFIRM: Mon–Fri 7–5 per Oct 9 interview vs 9–5 per older docs]" },
      { id: "consent-text", status: "unconfirmed", note: "[CONFIRM] Draft consent wording for all four forms needs owner/Adam approval (policyVersion *-draft-2026-10-14)." },
      { id: "privacy-policy", status: "unconfirmed", note: "[CONFIRM] Privacy policy is a draft pending attorney review." },
      { id: "production-origin", status: "unconfirmed", note: "[CONFIRM] Final production domain for canonical URLs (csshvacga.com assumed)." },
    ],
  },
};
