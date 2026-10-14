// Node-only: every unresolved release item in a site config — any "[CONFIRM" marker in a string
// value anywhere in the config, plus each site.releaseGates entry not approved with approvedBy
// and approvedOn. Never imported by browser code.
import { CONFIRM_MARKER } from "../src/lib/publicConfig.js";

export function unconfirmedItems(cfg) {
  const found = [];
  const walk = (value, path) => {
    if (typeof value === "string") {
      if (CONFIRM_MARKER.test(value)) found.push({ path, note: value });
    } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value && typeof value === "object")
      for (const [k, v] of Object.entries(value)) if (!(path === "site" && k === "releaseGates")) walk(v, path ? `${path}.${k}` : k);
  };
  walk(cfg, "");
  for (const gate of cfg.site?.releaseGates ?? [])
    if (gate.status !== "approved" || !gate.approvedBy || !gate.approvedOn) found.push({ path: `site.releaseGates.${gate.id}`, note: gate.note });
  return found;
}
