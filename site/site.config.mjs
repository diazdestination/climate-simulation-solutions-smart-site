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
const OWNER_NOV10 = { approvedBy: "CSS owner via Adam (Claude chat, 2026-11-10)", approvedOn: "2026-11-10" };
const DEMO_APPROVAL = { approvedBy: "Adam (shown on the owner-approved CSS v8 demo)", approvedOn: "2026-10-09" };

export default {
  // ---- Brand -------------------------------------------------------------------------
  brand: {
    name: { value: "Climate Simulation Solutions", ...BRAND_APPROVAL },
    slug: "climate-simulation-solutions",
  },

  // ---- Contact facts (E.164) ---------------------------------------------------------
  // 2026-11-10 (CSS owner via Adam): publish (706) 502-0877 on the site until the owner says
  // otherwise. It replaces (706) 809-5076, the line shown on the old csshvacga.com site and the
  // v8 demo. Whether the old line stays on Google/Facebook listings is an open owner question.
  // No public business email is published; owners' direct contacts are NOT published.
  contact: {
    mainPhone: { value: "+17065020877", display: "(706) 502-0877", ...OWNER_NOV10 },
    // Same line: the owner named no separate emergency or on-call number.
    emergencyPhone: { value: "+17065020877", display: "(706) 502-0877", ...OWNER_NOV10 },
  },

  // ---- Hours -------------------------------------------------------------------------
  // 2026-11-10 (Adam): use the hours published on the old csshvacga.com site — Mon–Fri 9–5 and
  // Sat–Sun 8–6. This supersedes the Mon–Fri 7–5 recorded on 2026-10-14 (Oct 9 owner interview).
  hours: {
    summary: {
      value: "Monday–Friday, 9 a.m. to 5 p.m.; Saturday and Sunday, 8 a.m. to 6 p.m.",
      display: "Monday–Friday, 9 a.m. to 5 p.m.; Saturday and Sunday, 8 a.m. to 6 p.m.",
      approvedBy: "Adam (Claude chat, 2026-11-10): hours as shown on the old CSS site",
      approvedOn: "2026-11-10",
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
        policyVersion: "css-urgent-request-v1",
        channels: ["phone", "email"],
        consentText:
          "By sending this urgent request, I agree that Climate Simulation Solutions may call me, or email me if I gave an email address, about this request. Sending it does not dispatch a technician or confirm an arrival time. This website does not send text messages.",
        serviceCodes: ["repair", "not-sure"],
        requirePhone: true,
        requirePostalCode: true,
      },
      "service-request": {
        policyVersion: "css-service-request-v1",
        channels: ["phone", "email"],
        consentText:
          "By sending this request, I agree that Climate Simulation Solutions may call me, or email me if I gave an email address, about this request. Preferred times are a request only; the office confirms any appointment. This website does not send text messages.",
        requirePhone: true,
        requirePostalCode: true,
      },
      "maintenance-plan": {
        policyVersion: "css-maintenance-plan-v1",
        channels: ["phone", "email"],
        consentText:
          "By sending this request, I agree that Climate Simulation Solutions may call me, or email me if I gave an email address, about a maintenance plan. This is not an enrollment or a charge; the office explains plan details and pricing directly. This website does not send text messages.",
        serviceCodes: ["maintenance"],
        requirePhone: true,
        requirePostalCode: true,
      },
      "estimate-question": {
        policyVersion: "css-estimate-question-v1",
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
  // Owner decision 2026-10-14 ("1c"): until the CSS GrowthOS site record exists, web leads are
  // emailed to the owners (addresses only in secrets). Setting SMART_SITE_GROWTHOS_ENABLED=true
  // switches every lead to GrowthOS and the email path off automatically.
  emailBridge: { enabled: true, preGrowthOS: true },

  // ---- Website assistant -------------------------------------------------------------
  // Owner decision 2026-10-14: CSS launches with a TEXT chat assistant. Spoken voice stays built in
  // but off (modes.voice false) until CSS approves it; flip to true to demo or enable later.
  voice: {
    enabled: true,
    public: false,
    modes: { text: true, voice: false },
    fileUploads: true,
    agent: {
      name: "Climate Simulation Solutions Website Assistant",
      language: "en",
      timezone: "America/New_York",
      llm: "gemini-2.5-flash",
      temperature: 0.1,
      maxTokens: 650,
      // sync_case is the registry's service-case tool (no HVAC-specific name exists yet).
      tools: ["sync_case", "show_call_path", "open_written_request"],
      asrKeywords: ["furnace", "heat pump", "air handler", "condenser", "thermostat", "ductwork", "refrigeration", "Dawsonville"],
      limits: { dailyLimit: 15, concurrency: 2, maxDurationSeconds: 600 }, // budget plan 2026-10-14
      privacy: { recordVoice: false, retentionDays: 1, deleteTranscriptAndPii: true, deleteAudio: true },
      voiceId: undefined,
    },
  },

  modules: { weatherHail: { enabled: false } },
  assets: { htmlFallback: "route-only" },

  // ---- CSS site-only settings (ignored by the core schema) ---------------------------
  site: {
    // Production domain comes from SITE_PUBLIC_ORIGIN at build time (e.g. https://www.example.com).
    // csshvacga.com is CSS's OLD domain (registered elsewhere, not securable); nothing depends on it.
    // Approved 2026-10-14: csshvac.com (climatesimulationsolutions.com 301-redirects to it).
    // SITE_PUBLIC_ORIGIN can override for previews.
    origin: globalThis.process?.env?.SITE_PUBLIC_ORIGIN?.trim() || "https://csshvac.com",
    location: { city: "Dawsonville", state: "GA" },
    timezone: "America/New_York",
    // Structured weekday schedule used for the live "open now" badge. Stays null until
    // hours.summary is confirmed; the site then shows only the neutral fallback.
    // One entry per block of days that share opening times.
    hoursSchedule: [
      { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], open: "09:00", close: "17:00" },
      { days: ["Sat", "Sun"], open: "08:00", close: "18:00" },
    ],
    // License number supplied by the CSS owner (via Adam, 2026-11-10). The issuing board and
    // license class were not stated, so the site shows the number without naming either.
    license: { number: "23196912", ...OWNER_NOV10 },
    // Maintenance plan facts (Oct 9 owner interview). Prices/inclusions are NOT approved.
    maintenancePlans: {
      residential: { cadence: "One visit every six months", approvedBy: "Owner interview (Heather/Nathaniel via Adam)", approvedOn: "2026-10-09" },
      commercial: { cadence: "Quarterly visits", approvedBy: "Owner interview (Heather/Nathaniel via Adam)", approvedOn: "2026-10-09" },
      billing: { value: "Billed annually", approvedBy: "Owner interview (Heather/Nathaniel via Adam)", approvedOn: "2026-10-09" },
      pricing: null, // "pricing provided by the office" until approved
    },
    // Release gates that are not single facts. status "approved" requires approvedBy/approvedOn.
    releaseGates: [
      { id: "hours", status: "approved", approvedBy: "Adam (Claude chat, 2026-11-10)", approvedOn: "2026-11-10", note: "Mon–Fri 9 a.m.–5 p.m. and Sat–Sun 8 a.m.–6 p.m., as published on the old CSS site; the 7–5 recorded 2026-10-14 is superseded." },
      { id: "consent-text", status: "approved", approvedBy: "Adam (Claude chat, 2026-10-14)", approvedOn: "2026-10-14", note: "Consent wording for all four forms approved as drafted (policy versions css-*-v1)." },
      // Owner decision 2026-10-14 ("2 yes"): launch with the draft clearly labeled and the policy page
      // noindex. Not an attorney approval: set status "approved" only after review.
      { id: "privacy-policy", status: "approved-draft", pendingReview: "attorney review of the privacy policy (legal entity, mailing address, privacy email, retention)", approvedBy: "Adam (Claude chat, 2026-10-14)", approvedOn: "2026-10-14", note: "Launch with the policy labeled \"Draft — pending attorney review\" and noindex; attorney review still pending." },
      { id: "production-origin", status: "approved", approvedBy: "Adam (Claude chat, 2026-10-14)", approvedOn: "2026-10-14", note: "csshvac.com approved (purchase via Cloudflare by Codex); climatesimulationsolutions.com redirects to it. csshvacga.com is the old, unavailable domain." },
    ],
  },
};
