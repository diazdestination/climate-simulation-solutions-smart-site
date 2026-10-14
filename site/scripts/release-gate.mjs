#!/usr/bin/env node
// Release gate: the site must not be published while any owner fact is unconfirmed.
//
//   node scripts/release-gate.mjs            report only (exit 0), used by the build
//   node scripts/release-gate.mjs --strict   exit 1 while anything is unconfirmed, unless the
//                                            explicit LOCAL flag SITE_ALLOW_UNCONFIRMED_FACTS=true
//                                            is set in the process environment
//
// "Unconfirmed" = any "[CONFIRM" marker in site.config.mjs (e.g. the 7-5 vs 9-5 hours conflict)
// plus every site.releaseGates entry that is not status "approved" with approvedBy/approvedOn.
// Never set SITE_ALLOW_UNCONFIRMED_FACTS in wrangler.jsonc vars or CI deploy jobs.
import process from "node:process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function evaluateRelease({ config, env = process.env } = {}) {
  const cfg = config ?? (await import(pathToFileURL(path.join(root, "site.config.mjs")).href)).default;
  const { unconfirmedItems } = await import("./unconfirmed.mjs");
  const items = unconfirmedItems(cfg);
  const override = env.SITE_ALLOW_UNCONFIRMED_FACTS === "true";
  return { publishable: items.length === 0, override, allowed: items.length === 0 || override, items };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const strict = process.argv.includes("--strict");
  const result = await evaluateRelease();
  if (result.publishable) {
    process.stdout.write("Release gate: all owner facts confirmed.\n");
  } else {
    const lines = result.items.map((i) => `  - ${i.path}: ${i.note}`).join("\n");
    process.stderr.write(`Release gate: NOT PUBLISHABLE — ${result.items.length} unconfirmed item(s):\n${lines}\n`);
    if (strict && !result.override) {
      process.stderr.write("Refusing to publish. Confirm the facts in site.config.mjs (or set SITE_ALLOW_UNCONFIRMED_FACTS=true for a LOCAL build only).\n");
      process.exitCode = 1;
    } else if (strict) {
      process.stderr.write("SITE_ALLOW_UNCONFIRMED_FACTS=true: local override in effect. Do not deploy this build.\n");
    }
  }
}
