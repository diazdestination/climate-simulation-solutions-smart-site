// validateSiteConfig(config) -> { ok, errors: string[] }
// Pure; no I/O. Run in tests, in new-client/provision, and before every deploy.
import { GROWTHOS_PROFILES } from "./growthos-profiles.mjs";
import { TOOL_REGISTRY } from "../agent/tool-registry.mjs";

export { GROWTHOS_PROFILES };
export const E164 = /^\+[1-9]\d{7,14}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const POLICY_VERSION = /^[a-zA-Z0-9._-]{1,80}$/;
const KEY = /^[a-z0-9][a-z0-9-]{1,80}$/;
const TIMING = ["urgent", "soon", "planning", "unsure"];
const CHANNELS = ["phone", "email", "sms"];
const PLACEHOLDER = /\{\{\s*[^}]*\}\}/;

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Every string under value that still contains a {{placeholder}}; returns dotted paths. */
export function findPlaceholders(value, path = "") {
  if (typeof value === "string") return PLACEHOLDER.test(value) ? [path || "(root)"] : [];
  if (Array.isArray(value))
    return value.flatMap((v, i) => findPlaceholders(v, `${path}[${i}]`));
  if (isObject(value))
    return Object.entries(value).flatMap(([k, v]) =>
      findPlaceholders(v, path ? `${path}.${k}` : k),
    );
  return [];
}

function checkFact(errors, path, fact, { phone = false, required = true } = {}) {
  if (fact === undefined) {
    if (required) errors.push(`${path} is required`);
    return;
  }
  if (!isObject(fact) || typeof fact.value !== "string" || !fact.value.trim()) {
    errors.push(`${path} must be a fact object { value, approvedBy, approvedOn }`);
    return;
  }
  if (typeof fact.approvedBy !== "string" || fact.approvedBy.trim().length < 2)
    errors.push(`${path}.approvedBy is required (owner-approved facts only)`);
  if (typeof fact.approvedOn !== "string" || !ISO_DATE.test(fact.approvedOn) || Number.isNaN(Date.parse(fact.approvedOn)))
    errors.push(`${path}.approvedOn must be an ISO date (YYYY-MM-DD)`);
  if (phone && !E164.test(fact.value)) errors.push(`${path}.value must be E.164 (e.g. +14045550100)`);
}

/** Every fact under a section (contact/hours/serviceArea) needs approval metadata. */
function checkFactSection(errors, name, section, requiredKeys, phoneKeys = []) {
  if (!isObject(section)) {
    errors.push(`${name} is required`);
    return;
  }
  for (const key of requiredKeys)
    if (section[key] === undefined) errors.push(`${name}.${key} is required`);
  for (const [key, fact] of Object.entries(section))
    checkFact(errors, `${name}.${key}`, fact, { phone: phoneKeys.includes(key) || /phone$/i.test(key) });
}

export function validateSiteConfig(config) {
  const errors = [];
  if (!isObject(config)) return { ok: false, errors: ["config must be an object"] };

  // Brand
  if (!isObject(config.brand)) errors.push("brand is required");
  else {
    checkFact(errors, "brand.name", config.brand.name);
    if (!KEY.test(config.brand.slug ?? "")) errors.push("brand.slug must be a lowercase key");
  }

  // Owner-approved facts
  checkFactSection(errors, "contact", config.contact, ["mainPhone"]);
  checkFactSection(errors, "hours", config.hours, ["summary"]);
  checkFactSection(errors, "serviceArea", config.serviceArea, ["summary"]);

  // GrowthOS
  const g = config.growthos;
  if (!isObject(g)) errors.push("growthos is required");
  else {
    if (typeof g.enabled !== "boolean") errors.push("growthos.enabled must be boolean");
    if (!KEY.test(g.tenantKey ?? "")) errors.push("growthos.tenantKey must be a lowercase key");
    if (!KEY.test(g.sourceKey ?? "")) errors.push("growthos.sourceKey must be a lowercase key");
    const profile = GROWTHOS_PROFILES[g.profile];
    if (!profile) errors.push(`growthos.profile must be one of ${Object.keys(GROWTHOS_PROFILES).join(", ")}`);
    if (!Array.isArray(g.serviceCodes) || !g.serviceCodes.length)
      errors.push("growthos.serviceCodes must be a non-empty array");
    else if (profile)
      for (const code of g.serviceCodes)
        if (!profile.includes(code))
          errors.push(`growthos.serviceCodes: "${code}" is not in the GrowthOS "${g.profile}" profile`);
    if (g.apiOrigin !== undefined && g.apiOrigin !== "https://app.mogulforge.ai")
      errors.push("growthos.apiOrigin must be https://app.mogulforge.ai (loopback is allowed only at runtime from a loopback preview)");
    if (g.leadPaths !== undefined && (!Array.isArray(g.leadPaths) || g.leadPaths.some((p) => !/^\/api\/[a-z0-9/-]+$/.test(p))))
      errors.push("growthos.leadPaths must be /api/... paths");
    if (!isObject(g.forms) || !Object.keys(g.forms).length) errors.push("growthos.forms must declare at least one form");
    else {
      if (g.defaultFormId !== undefined && !Object.hasOwn(g.forms, g.defaultFormId))
        errors.push("growthos.defaultFormId must name a declared form");
      for (const [formId, form] of Object.entries(g.forms)) {
        const p = `growthos.forms.${formId}`;
        if (!KEY.test(formId)) errors.push(`${p}: form id must be a lowercase key`);
        if (!isObject(form)) {
          errors.push(`${p} must be an object`);
          continue;
        }
        if (!POLICY_VERSION.test(form.policyVersion ?? "")) errors.push(`${p}.policyVersion is required ([a-zA-Z0-9._-], max 80)`);
        if (!Array.isArray(form.channels) || !form.channels.length) errors.push(`${p}.channels must be a non-empty array`);
        else {
          for (const c of form.channels) if (!CHANNELS.includes(c)) errors.push(`${p}.channels: "${c}" is not a GrowthOS channel`);
          if (form.channels.includes("sms") && config.sms?.compliantConsentApproved !== true)
            errors.push(`${p}.channels includes "sms" but sms.compliantConsentApproved is not true`);
        }
        if (form.serviceCodes !== undefined) {
          if (!Array.isArray(form.serviceCodes)) errors.push(`${p}.serviceCodes must be an array`);
          else for (const code of form.serviceCodes)
            if (!(g.serviceCodes ?? []).includes(code)) errors.push(`${p}.serviceCodes: "${code}" is not in growthos.serviceCodes`);
        }
        if (typeof form.consentText !== "string" || form.consentText.trim().length < 30)
          errors.push(`${p}.consentText (the exact reviewed disclosure shown next to the checkbox) is required`);
      }
    }
    if (g.timingMap !== undefined) {
      if (!isObject(g.timingMap)) errors.push("growthos.timingMap must be an object");
      else for (const [formId, map] of Object.entries(g.timingMap)) {
        if (!Object.hasOwn(g.forms ?? {}, formId)) errors.push(`growthos.timingMap.${formId} names an undeclared form`);
        for (const [k, v] of Object.entries(map ?? {}))
          if (!TIMING.includes(v)) errors.push(`growthos.timingMap.${formId}.${k}: "${v}" is not a GrowthOS timing`);
      }
    }
  }

  // SMS
  if (config.sms !== undefined) {
    if (!isObject(config.sms)) errors.push("sms must be an object");
    else if (config.sms.compliantConsentApproved === true && !(typeof config.sms.approvedBy === "string" && ISO_DATE.test(config.sms.approvedOn ?? "")))
      errors.push("sms.compliantConsentApproved requires sms.approvedBy and sms.approvedOn");
  }

  // Email bridge
  const preGrowthOS = config.emailBridge?.preGrowthOS;
  if (preGrowthOS !== undefined && typeof preGrowthOS !== "boolean")
    errors.push("emailBridge.preGrowthOS must be boolean");
  if (preGrowthOS === true && config.emailBridge?.enabled !== true)
    errors.push("emailBridge.preGrowthOS requires emailBridge.enabled");
  // The one allowed overlap: pre-GrowthOS mode stops the bridge once SMART_SITE_GROWTHOS_ENABLED is on.
  if (config.emailBridge?.enabled === true && g?.enabled === true && preGrowthOS !== true)
    errors.push("emailBridge.enabled must be false while growthos.enabled is true (GrowthOS owns lead automations) unless emailBridge.preGrowthOS is true");

  // Voice / agent
  const v = config.voice;
  if (v !== undefined) {
    if (!isObject(v)) errors.push("voice must be an object");
    else {
      if (v.public !== undefined && typeof v.public !== "boolean") errors.push("voice.public must be boolean");
      if (v.modes !== undefined) {
        if (!isObject(v.modes)) errors.push("voice.modes must be an object");
        else {
          for (const k of ["text", "voice"])
            if (v.modes[k] !== undefined && typeof v.modes[k] !== "boolean") errors.push(`voice.modes.${k} must be boolean`);
          if (v.modes.text === false && v.modes.voice === false) errors.push("voice.modes must enable text or voice (or set voice.enabled false)");
        }
      }
      const tools = v.agent?.tools ?? [];
      if (!Array.isArray(tools)) errors.push("voice.agent.tools must be an array");
      else for (const name of tools) {
        const tool = TOOL_REGISTRY[name];
        if (!tool) errors.push(`voice.agent.tools: "${name}" is not in the tool registry`);
        else if (tool.module && config.modules?.[tool.module]?.enabled !== true)
          errors.push(`voice.agent.tools: "${name}" requires modules.${tool.module}.enabled`);
      }
      const limits = v.agent?.limits ?? {};
      for (const [k, max] of [["dailyLimit", 1000], ["concurrency", 20], ["maxDurationSeconds", 3600]])
        if (limits[k] !== undefined && !(Number.isInteger(limits[k]) && limits[k] > 0 && limits[k] <= max))
          errors.push(`voice.agent.limits.${k} must be an integer 1..${max}`);
      const privacy = v.agent?.privacy ?? {};
      if (privacy.retentionDays !== undefined && !(Number.isInteger(privacy.retentionDays) && privacy.retentionDays >= 0 && privacy.retentionDays <= 30))
        errors.push("voice.agent.privacy.retentionDays must be an integer 0..30");
      if (privacy.recordVoice === true) errors.push("voice.agent.privacy.recordVoice must stay false in the starter defaults");
    }
  }

  if (config.assets?.htmlFallback !== undefined && !["none", "route-only", "route-then-index"].includes(config.assets.htmlFallback))
    errors.push("assets.htmlFallback must be none, route-only or route-then-index");

  for (const path of findPlaceholders(config)) errors.push(`${path} still contains a {{placeholder}}`);

  return { ok: errors.length === 0, errors };
}

export function assertSiteConfig(config) {
  const { ok, errors } = validateSiteConfig(config);
  if (!ok) throw new Error(`Invalid site config:\n- ${errors.join("\n- ")}`);
  return config;
}
