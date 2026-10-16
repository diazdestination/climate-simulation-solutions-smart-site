// Synthetic fixtures only: 555-01xx phone numbers, example.test emails, fake UUIDs/secrets.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const read = (...p) => readFileSync(path.join(root, ...p), "utf8");
export const siteId = "eeeeeeee-1111-4111-8111-aaaaaaaaaaaa";
export const leadId = "dddddddd-1111-4111-8111-aaaaaaaaaaaa";
export const receiptId = "cccccccc-1111-4111-8111-aaaaaaaaaaaa";
export const testSecret = `ss_${"a".repeat(64)}`;
export const PUBLIC_ORIGIN = "https://css-preview.example.test";

export const prodEnv = (extra = {}) => ({
  SMART_SITE_GROWTHOS_ENABLED: "true",
  GROWTHOS_API_ORIGIN: "https://app.mogulforge.ai",
  GROWTHOS_SITE_ID: siteId,
  GROWTHOS_SITE_SECRET: testSecret,
  ...extra,
});

export const customer = (extra = {}) => ({
  name: "Synthetic Test Customer",
  phone: "706-555-0142",
  email: "synthetic@example.test",
  address: "100 Example Test Way",
  city: "Dawsonville",
  state: "GA",
  zip: "30534",
  consent: true,
  ...extra,
});

export const postLead = (body, { origin = PUBLIC_ORIGIN, headers = {} } = {}) =>
  new Request(`${PUBLIC_ORIGIN}/api/lead`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}), ...headers },
    body: JSON.stringify(body),
  });

/** Recording GrowthOS stub that returns a valid saved receipt. */
export function growthosStub() {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init, body: init?.body ? JSON.parse(init.body) : null });
    return Response.json({ status: "saved", leadId, receiptId, duplicate: false }, { status: 201 });
  };
  return { calls, fetchImpl };
}

export function ensureBuilt() {
  if (existsSync(path.join(root, "dist", "index.html")) && existsSync(path.join(root, "dist", "urgent", "index.html"))) return;
  const r = spawnSync(process.execPath, [path.join(root, "scripts", "build.mjs")], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`build failed:\n${r.stdout}\n${r.stderr}`);
}

export function walkFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walkFiles(abs));
    else out.push(abs);
  }
  return out;
}
