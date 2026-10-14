#!/usr/bin/env node
// Validates site.config.mjs with the core schema and prints a short, secret-free summary.
import { validateSiteConfig } from "../core/config/schema.mjs";
import config from "../site.config.mjs";

const { ok, errors } = validateSiteConfig(config);
if (!ok) {
  process.stderr.write(`site.config.mjs is invalid:\n- ${errors.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  const forms = Object.entries(config.growthos.forms).map(([id, f]) => `${id} [${f.channels.join("+")}]`);
  process.stdout.write(`site.config.mjs valid. profile=${config.growthos.profile} forms=${forms.join(", ")} sms=${config.sms.compliantConsentApproved} voice.public=${config.voice.public}\n`);
}
