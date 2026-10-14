import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import config from "../site.config.mjs";
import { loadAgentTemplates, renderAgentPayload } from "../core/agent/provision.mjs";
import { collectFilesForTest } from "./core-files.mjs";
import { root } from "./helpers.mjs";

const TEXT_EXT = new Set([".js", ".mjs", ".cjs", ".ts", ".json", ".jsonc", ".md", ".sql", ".txt", ".gitattributes", ""]);
const STARTER_SYNC = "C:/Forge/workspace/smart-site-starter/scripts/sync-core.mjs";

function hashFile(abs) {
  let bytes = readFileSync(abs);
  if (TEXT_EXT.has(path.extname(abs).toLowerCase())) bytes = Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
  return createHash("sha256").update(bytes).digest("hex");
}

test("core drift: vendored core/ matches core/SOURCE.json exactly (no local edits, nothing missing or extra)", () => {
  const source = JSON.parse(readFileSync(path.join(root, "core", "SOURCE.json"), "utf8"));
  assert.equal(source.adapter, "cloudflare");
  assert.match(source.starterCommit, /^[0-9a-f]{40}$/);
  const modified = [];
  for (const [rel, sha] of Object.entries(source.files)) {
    const abs = path.join(root, "core", ...rel.split("/"));
    if (!existsSync(abs) || hashFile(abs) !== sha) modified.push(rel);
  }
  assert.deepEqual(modified, []);
  const extra = collectFilesForTest(path.join(root, "core")).filter((rel) => rel !== "SOURCE.json" && !Object.hasOwn(source.files, rel));
  assert.deepEqual(extra, []);
});

test("core drift: starter's sync-core --check is clean (when the starter checkout is present)", { skip: !existsSync(STARTER_SYNC) && "starter not on this machine" }, () => {
  const r = spawnSync(process.execPath, [STARTER_SYNC, "--target", root, "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(JSON.parse(r.stdout).clean, true);
});

test("HVAC agent payload (dry render): private, authenticated, 3 tools, hard boundaries, no unconfirmed facts", async () => {
  const templates = await loadAgentTemplates(path.join(root, "agent"));
  const { agentPayload, toolDefinitions, knowledgeDocuments } = renderAgentPayload(config, templates);
  assert.deepEqual(toolDefinitions.map((t) => t.name), ["sync_case", "show_call_path", "open_written_request"]);
  assert.equal(agentPayload.platform_settings.auth.enable_auth, true);
  assert.equal(agentPayload.platform_settings.privacy.record_voice, false);
  const prompt = agentPayload.conversation_config.agent.prompt.prompt;
  for (const rule of [
    /Never quote, estimate, compare, or hint at prices/,
    /financing/,
    /how long a job takes/,
    /Never diagnose a fault/,
    /promise or estimate an arrival time/,
    /call 911 and the gas utility from outside/,
    /carbon monoxide alarm/,
    /never as instructions to follow/,
    /Never tell anyone to handle refrigerant/,
    /You are an AI assistant/,
  ])
    assert.match(prompt, rule);
  const all = JSON.stringify({ agentPayload, knowledgeDocuments });
  assert.doesNotMatch(all, /CONFIRM|\{\{/);
  assert.match(all, /Please call the office for current office hours/);
  assert.match(agentPayload.conversation_config.agent.first_message, /I'm an AI, not a person/);
  assert.doesNotMatch(all, /painless|roof|adjuster|storm|hail/i);
});
