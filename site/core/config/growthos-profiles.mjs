// Copied from the GrowthOS intake contract. Keep in sync by hand; a mismatch makes
// GrowthOS reject intake (or mis-file it) even though the site validates.
// Source: C:\Forge\worktrees\growthos-media-capture-20261012\artifacts\api-server\src\services\smart-site-contract.ts
//         (SMART_SITE_PROFILES), read 2026-10-13.
export const GROWTHOS_PROFILES = Object.freeze({
  "roofing-exteriors": Object.freeze([
    "roof-replacement",
    "roof-repair",
    "new-construction",
    "siding",
    "gutters",
    "metal-roofing",
    "commercial-roofing",
    "roof-leak",
    "storm-damage",
    "water-damage",
    "not-sure",
  ]),
  hvac: Object.freeze([
    "repair",
    "replacement",
    "maintenance",
    "new-installation",
    "not-sure",
  ]),
  "commercial-construction": Object.freeze([
    "new-build",
    "renovation",
    "tenant-improvement",
    "project-consultation",
  ]),
  "local-retail": Object.freeze([
    "general-inquiry",
    "group-order",
    "event",
    "partnership",
  ]),
});
