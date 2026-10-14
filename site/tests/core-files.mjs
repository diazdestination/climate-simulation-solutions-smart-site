// Mirrors smart-site-starter scripts/sync-core.mjs collectFiles() for the self-contained drift test.
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const IGNORED = new Set(["node_modules", ".DS_Store", "Thumbs.db"]);

export function collectFilesForTest(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (IGNORED.has(name)) continue;
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...collectFilesForTest(abs, base));
    else out.push(path.relative(base, abs).split(path.sep).join("/"));
  }
  return out.sort();
}
