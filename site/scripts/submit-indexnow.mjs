import { readdirSync, readFileSync, writeFileSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

const origin = "https://csshvac.com";
const { ROUTES } = await import("../src/routes.js");
const pages = ROUTES.filter(page => !page.noindex);
const publicDir = new URL("../public/", import.meta.url);
const files = readdirSync(publicDir).filter(file => /^[a-f0-9]{32}\.txt$/.test(file));
if (files.length !== 1) throw new Error("Expected exactly one prepared IndexNow ownership file.");
const key = readFileSync(new URL(files[0], publicDir), "utf8").trim();
if (files[0] !== `${key}.txt`) throw new Error("IndexNow ownership file does not match its content.");
const keyLocation = `${origin}/${files[0]}`;
const curl = process.platform === "win32" ? "curl.exe" : "curl";
const tempRoot = realpathSync(tmpdir());
const directory = mkdtempSync(join(tempRoot, "css-indexnow-"));
function runCurl(args, options, failureMessage) {
  try {
    return execFileSync(curl, args, options);
  } catch {
    throw new Error(failureMessage);
  }
}
try {
  const probe = runCurl(["-sS", "--max-time", "30", keyLocation], { encoding: "utf8" }, "Ownership proof request failed; no URLs submitted. Retry after checking network access.");
  if (probe.trim() !== key) throw new Error("Published ownership proof is not yet readable; no URLs submitted.");
  const body = { host: "csshvac.com", key, keyLocation, urlList: pages.map(page => origin + page.path) };
  const responseFile = join(directory, "response.txt");
  const status = Number(runCurl(["-sS", "--max-time", "30", "-o", responseFile, "-w", "%{http_code}", "-H", "Content-Type: application/json; charset=utf-8", "--data-binary", "@-", "https://api.indexnow.org/indexnow"], { input: JSON.stringify(body), encoding: "utf8" }, "IndexNow notification request failed; receipt is unknown. Check connectivity before retrying.").trim());
  const receipt = { submitted_at: new Date().toISOString(), endpoint: "https://api.indexnow.org/indexnow", status, url_count: body.urlList.length, ownership_file_readback: true, accepted: status === 200 || status === 202, key_validation_pending: status === 202, indexing_confirmed: false };
  const outputIndex = process.argv.indexOf("--output");
  if (outputIndex !== -1) writeFileSync(process.argv[outputIndex + 1], JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt, null, 2));
  if (!receipt.accepted) process.exitCode = 1;
} finally {
  const cleanupTarget = realpathSync(directory);
  if (dirname(cleanupTarget) !== tempRoot || !basename(cleanupTarget).startsWith("css-indexnow-")) {
    throw new Error("Temporary cleanup path is outside the expected task directory; files preserved.");
  }
  rmSync(cleanupTarget, { recursive: true, force: true });
}
