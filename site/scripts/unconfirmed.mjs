// Node-only: every unresolved release item in a site config — any "[CONFIRM" marker in a string
// value anywhere in the config, plus each site.releaseGates entry not approved with approvedBy
// and approvedOn. Never imported by browser code.
//
// A gate may instead be "approved-draft": the owner approved launching with a clearly labeled
// draft while a review is still pending (pendingReview). It needs approvedBy/approvedOn, and for
// the privacy policy the page itself must still show the draft banner and stay noindex, so the
// override cannot outlive its label.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIRM_MARKER } from "../src/lib/publicConfig.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PRIVACY_DRAFT_LABEL = "Draft — pending attorney review";

export function privacyDraftLabelProblems(html) {
  const problems = [];
  if (!/<meta\s+name="robots"\s+content="noindex[^"]*"/i.test(html)) problems.push("privacy page is not noindex");
  if (!html.includes(PRIVACY_DRAFT_LABEL)) problems.push(`privacy page lacks the "${PRIVACY_DRAFT_LABEL}" banner`);
  return problems;
}

export function unconfirmedItems(cfg, { privacyHtml } = {}) {
  const found = [];
  const walk = (value, path) => {
    if (typeof value === "string") {
      if (CONFIRM_MARKER.test(value)) found.push({ path, note: value });
    } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value && typeof value === "object")
      for (const [k, v] of Object.entries(value)) if (!(path === "site" && k === "releaseGates")) walk(v, path ? `${path}.${k}` : k);
  };
  walk(cfg, "");
  for (const gate of cfg.site?.releaseGates ?? []) {
    const signed = Boolean(gate.approvedBy && gate.approvedOn);
    if (gate.status === "approved" && signed) continue;
    if (gate.status === "approved-draft" && signed && gate.pendingReview) {
      if (gate.id !== "privacy-policy") continue;
      const html = privacyHtml ?? fs.readFileSync(path.join(root, "public", "privacy", "index.html"), "utf8");
      const problems = privacyDraftLabelProblems(html);
      if (!problems.length) continue;
      found.push({ path: `site.releaseGates.${gate.id}`, note: `approved only as a labeled draft: ${problems.join("; ")}` });
      continue;
    }
    found.push({ path: `site.releaseGates.${gate.id}`, note: gate.note });
  }
  return found;
}

/** Gates released as labeled drafts, so the release check can say what is still pending. */
export function draftGates(cfg) {
  return (cfg.site?.releaseGates ?? [])
    .filter((g) => g.status === "approved-draft")
    .map((g) => ({ path: `site.releaseGates.${g.id}`, pendingReview: g.pendingReview, approvedBy: g.approvedBy, approvedOn: g.approvedOn }));
}
