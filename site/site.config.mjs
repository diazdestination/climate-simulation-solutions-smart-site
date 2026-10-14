// Site config for a FICTIONAL client, "Example Heating & Air". Every phone number is a
// reserved 555-01xx fiction and every address uses example.com. Copy this file to a
// client repo as site.config.mjs (scripts/new-client.mjs does that) and replace each
// fact only with an owner-approved value: who approved it and when is required.
//
// This file contains NO secrets. Credentials (GrowthOS site secret, outbox keys,
// ElevenLabs key) live only in the host's secret store; see docs/env-checklist.md.
// Validate with: node -e "import('./core/config/schema.mjs').then(async m=>console.log(m.validateSiteConfig((await import('./site.config.mjs')).default)))"

export default {
  // ---- Brand -------------------------------------------------------------------------
  brand: {
    // Facts are { value, approvedBy, approvedOn } (+ optional display for speech/print).
    name: { value: "Example Heating & Air", approvedBy: "Example Owner", approvedOn: "2026-10-13" },
    // Lowercase key used for logs/codes and default worker names.
    slug: "example-heating-and-air",
  },

  // ---- Owner-approved contact facts (E.164 for every *Phone) ------------------------
  contact: {
    mainPhone: {
      value: "+14045550100",
      display: "(404) 555-0100",
      approvedBy: "Example Owner",
      approvedOn: "2026-10-13",
    },
    // Used by the agent's safety escalation line. Must be a line someone actually answers.
    emergencyPhone: {
      value: "+14045550101",
      display: "(404) 555-0101",
      approvedBy: "Example Owner",
      approvedOn: "2026-10-13",
    },
    officeEmail: { value: "office@example.com", approvedBy: "Example Owner", approvedOn: "2026-10-13" },
  },
  hours: {
    // Never imply 24/7 dispatch unless the owner approved exactly that wording.
    summary: {
      value: "Monday to Friday, 8 a.m. to 5 p.m. Eastern; arrival times are confirmed by the office",
      approvedBy: "Example Owner",
      approvedOn: "2026-10-13",
    },
  },
  serviceArea: {
    summary: {
      value: "Example County and nearby communities",
      approvedBy: "Example Owner",
      approvedOn: "2026-10-13",
    },
  },

  // ---- GrowthOS (approved default: connected from day one) ---------------------------
  // enabled: true means GrowthOS is the single lead system of record. The site's own
  // email bridge, SMS and autoresponders are then forced off. Delivery still fails
  // closed (503) until the host env sets SMART_SITE_GROWTHOS_ENABLED=true plus a real
  // GROWTHOS_SITE_ID / GROWTHOS_SITE_SECRET issued by the operator.
  growthos: {
    enabled: true,
    // Must match the GrowthOS site record; the browser envelope must echo both.
    tenantKey: "example-heating-and-air",
    sourceKey: "example-heating-and-air-website",
    // One of the GrowthOS profiles in core/config/growthos-profiles.mjs.
    profile: "hvac",
    // Subset of the profile's service codes this client actually offers.
    serviceCodes: ["repair", "replacement", "maintenance", "new-installation", "not-sure"],
    // Same-origin endpoints the browser posts to.
    leadPaths: ["/api/lead"],
    defaultFormId: "service-request",
    // Per form: reviewed consent policy version, the channels the disclosure actually
    // covers, and the exact disclosure text. Never add "sms" unless sms below is approved.
    forms: {
      "service-request": {
        policyVersion: "example-hvac-service-request-v1",
        channels: ["phone", "email"],
        consentText:
          "By sending this request you agree that Example Heating & Air may call or email you about it. This is not an appointment until the office confirms one.",
        requirePhone: true,
        requirePostalCode: true,
      },
    },
    // Maps a form's own urgency vocabulary onto GrowthOS timing (urgent|soon|planning|unsure).
    timingMap: {
      "service-request": {
        "no-heat-or-cooling": "urgent",
        "this-week": "soon",
        "planning-ahead": "planning",
        "not-sure": "unsure",
      },
    },
    // Optional hardening: reject POSTs without an Origin header (browsers send one).
    requireOriginHeader: false,
  },

  // ---- SMS: disabled until carrier/A2P-compliant consent is reviewed -----------------
  sms: { compliantConsentApproved: false },

  // ---- Legacy email bridge (only for sites NOT connected to GrowthOS) ---------------
  emailBridge: { enabled: false },

  // ---- Voice / chat agent (ElevenLabs) -----------------------------------------------
  voice: {
    enabled: true,
    // Private by default: session endpoints answer 403 off loopback. Public needs this
    // AND env ELEVENLABS_VOICE_PUBLIC=true, after bot protection + rate limits + caps.
    public: false,
    fileUploads: true,
    agent: {
      name: "Example Heating & Air Assistant (Preview)",
      language: "en",
      timezone: "America/New_York",
      llm: "gemini-2.5-flash",
      temperature: 0.1,
      maxTokens: 650,
      // Subset of core/agent/tool-registry.mjs. Weather lookup needs modules.weatherHail.
      tools: ["sync_case", "show_call_path", "open_written_request"],
      asrKeywords: ["furnace", "heat pump", "thermostat", "condenser", "ductwork"],
      limits: { dailyLimit: 25, concurrency: 1, maxDurationSeconds: 900 },
      privacy: { recordVoice: false, retentionDays: 1, deleteTranscriptAndPii: true, deleteAudio: true },
      // Optional: a specific ElevenLabs voice. Unset => keep the agent's existing voice.
      voiceId: undefined,
    },
  },

  // ---- Optional modules (all off by default) -----------------------------------------
  modules: {
    weatherHail: { enabled: false },
  },

  // ---- Static assets -----------------------------------------------------------------
  // route-only: /path -> /path/index.html for HTML requests; route-then-index: SPA shell.
  assets: { htmlFallback: "route-only" },
};
