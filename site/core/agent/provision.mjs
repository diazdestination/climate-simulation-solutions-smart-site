#!/usr/bin/env node
// ElevenLabs agent provisioning (Node-only; never imported by the worker).
//
// Library:
//   renderTemplate(text, config)                 pure {{path}} renderer; throws on unknown paths
//   loadAgentTemplates(dir)                      reads system-prompt.md, first-message.md, max-duration-message.md, kb/*.md
//   renderAgentPayload(config, templates, ctx)   pure; returns { agentPayload, knowledgeDocuments, toolDefinitions, voiceSource }
//   provisionAgent({ config, templates, apply, apiKey, fetchImpl })
//
// CLI:
//   node core/agent/provision.mjs --config ./site.config.mjs --templates ./agent           (dry run, default)
//   node core/agent/provision.mjs --config ./site.config.mjs --templates ./agent --apply   (real run)
// Dry run makes no network calls and prints the payload. A real run requires --apply AND
// ELEVENLABS_API_KEY in the process environment (this script never reads .env files) and
// never prints the key. Auth is always on; limits and privacy come from config.
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TOOL_REGISTRY } from "./tool-registry.mjs";
import { assertSiteConfig, findPlaceholders } from "../config/schema.mjs";

const API_ROOT = "https://api.elevenlabs.io/v1";

function lookup(config, dotted) {
  let value = config;
  for (const part of dotted.split(".")) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, part)) return undefined;
    value = value[part];
  }
  if (value && typeof value === "object") value = value.display ?? value.value;
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

export function renderTemplate(text, config) {
  const missing = [];
  const out = String(text).replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
    const value = lookup(config, key);
    if (value === undefined) {
      missing.push(key);
      return match;
    }
    return value;
  });
  if (missing.length) throw new Error(`template_placeholder_unresolved: ${[...new Set(missing)].join(", ")}`);
  return out;
}

export async function loadAgentTemplates(dir) {
  const read = (name) => readFile(path.join(dir, name), "utf8");
  const kbDir = path.join(dir, "kb");
  let kbFiles = [];
  try {
    kbFiles = (await readdir(kbDir)).filter((f) => f.endsWith(".md")).sort();
  } catch {
    /* no KB */
  }
  return {
    systemPrompt: await read("system-prompt.md"),
    firstMessage: await read("first-message.md"),
    maxDurationMessage: await read("max-duration-message.md").catch(() => ""),
    kb: await Promise.all(kbFiles.map(async (file) => ({ file, text: await read(path.join("kb", file)) }))),
  };
}

const shortHash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 10);

/**
 * Pure: config + templates (+ provider ids when known) -> payloads. No I/O.
 * ctx.existingTts preserves the agent's current voice unless voiceId is set.
 */
export function renderAgentPayload(config, templates, ctx = {}) {
  const agent = config.voice?.agent ?? {};
  const brandName = lookup(config, "brand.name");
  const systemPrompt = renderTemplate(templates.systemPrompt, config).trim();
  const firstMessage = renderTemplate(templates.firstMessage, config).trim();
  const maxDurationMessage = templates.maxDurationMessage
    ? renderTemplate(templates.maxDurationMessage, config).trim()
    : "";
  // Content-addressed KB names: changed facts produce a new document instead of a stale one.
  const knowledgeDocuments = (templates.kb ?? []).map(({ file, text }) => {
    const rendered = renderTemplate(text, config).trim();
    return { name: `${brandName} — ${file.replace(/\.md$/, "")} — ${shortHash(rendered)}`, text: rendered };
  });
  const toolDefinitions = (agent.tools ?? []).map((name) => {
    const tool = TOOL_REGISTRY[name];
    if (!tool) throw new Error(`tool_not_in_registry: ${name}`);
    return tool;
  });

  const existingTts = ctx.existingTts ?? {};
  const overrideVoice = (agent.voiceId ?? ctx.envVoiceId ?? "").trim();
  const voiceId = overrideVoice || existingTts.voice_id || undefined;
  const voiceSource = overrideVoice
    ? "explicit override"
    : existingTts.voice_id
      ? "preserved current agent selection"
      : "provider default (no voice set)";
  const limits = agent.limits ?? {};
  const privacy = agent.privacy ?? {};

  const agentPayload = {
    name: agent.name ?? `${brandName} Assistant`,
    tags: ["smart-site", config.brand.slug],
    conversation_config: {
      asr: {
        quality: "high",
        provider: "scribe_realtime",
        user_input_audio_format: "pcm_16000",
        keywords: [brandName, ...(agent.asrKeywords ?? [])],
      },
      turn: { turn_timeout: 8, silence_end_call_timeout: 240, turn_eagerness: "normal" },
      tts: {
        ...existingTts,
        model_id: existingTts.model_id || "eleven_flash_v2",
        ...(voiceId ? { voice_id: voiceId } : {}),
        agent_output_audio_format: existingTts.agent_output_audio_format || "pcm_16000",
      },
      conversation: {
        text_only: false,
        max_duration_seconds: limits.maxDurationSeconds ?? 900,
        client_events: ["audio", "interruption", "user_transcript", "agent_response", "client_tool_call"],
        file_input: {
          enabled: config.voice?.fileUploads !== false,
          max_files_in_memory: 6,
          max_files_per_conversation: 12,
        },
      },
      agent: {
        first_message: firstMessage,
        language: agent.language ?? "en",
        ...(maxDurationMessage ? { max_conversation_duration_message: maxDurationMessage } : {}),
        prompt: {
          prompt: systemPrompt,
          llm: agent.llm ?? "gemini-2.5-flash",
          temperature: agent.temperature ?? 0.1,
          max_tokens: agent.maxTokens ?? 650,
          tool_ids: ctx.toolIds ?? [],
          knowledge_base: (ctx.knowledge ?? []).map((k) => ({ type: "text", name: k.name, id: k.id, usage_mode: "prompt" })),
          rag: { enabled: false },
          ignore_default_personality: true,
          timezone: agent.timezone ?? "America/New_York",
        },
      },
    },
    platform_settings: {
      // Always authenticated: browsers get short-lived tokens from the site worker only.
      auth: { enable_auth: true, allowlist: [], require_origin_header: false },
      call_limits: {
        agent_concurrency_limit: limits.concurrency ?? 1,
        daily_limit: limits.dailyLimit ?? 25,
        bursting_enabled: false,
      },
      privacy: {
        record_voice: false,
        retention_days: privacy.retentionDays ?? 1,
        delete_transcript_and_pii: privacy.deleteTranscriptAndPii ?? true,
        delete_audio: privacy.deleteAudio ?? true,
        apply_to_existing_conversations: false,
        zero_retention_mode: false,
      },
      trust_context: "low",
      archived: false,
      summary_language: agent.language ?? "en",
    },
  };

  const leftovers = [
    ...findPlaceholders(agentPayload, "agentPayload"),
    ...findPlaceholders(knowledgeDocuments, "knowledgeDocuments"),
  ];
  if (leftovers.length) throw new Error(`template_placeholder_unresolved: ${leftovers.join(", ")}`);
  return { agentPayload, knowledgeDocuments, toolDefinitions, voiceSource };
}

function redact(message, secret) {
  return secret ? String(message).split(secret).join("[redacted]") : String(message);
}

function providerClient(apiKey, fetchImpl) {
  async function api(p, init = {}) {
    const response = await fetchImpl(`${API_ROOT}${p}`, {
      ...init,
      redirect: "error",
      headers: { accept: "application/json", "content-type": "application/json", "xi-api-key": apiKey, ...init.headers },
    });
    const text = await response.text();
    let payload = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { detail: text.slice(0, 300) };
      }
    }
    if (!response.ok) {
      const detail = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail ?? payload);
      throw new Error(redact(`ElevenLabs ${response.status}: ${detail.slice(0, 500)}`, apiKey));
    }
    return payload;
  }
  async function listAll(p, key) {
    const entries = [];
    let cursor = "";
    do {
      const sep = p.includes("?") ? "&" : "?";
      const page = await api(`${p}${cursor ? `${sep}cursor=${encodeURIComponent(cursor)}` : ""}`);
      entries.push(...(page[key] ?? []));
      cursor = page.has_more && page.next_cursor ? page.next_cursor : "";
    } while (cursor);
    return entries;
  }
  return { api, listAll };
}

export async function provisionAgent({ config, templates, apply = false, apiKey, envVoiceId, fetchImpl = fetch }) {
  assertSiteConfig(config);
  if (!apply) {
    // Dry run: render with placeholder ids. No network access.
    const rendered = renderAgentPayload(config, templates, { envVoiceId });
    return { dryRun: true, ...rendered };
  }
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is required for --apply (set it in the process environment)");
  const { api, listAll } = providerClient(apiKey, fetchImpl);
  try {
    // Render once without ids to validate everything before any write.
    const preview = renderAgentPayload(config, templates, { envVoiceId });

    const existingDocs = await listAll("/convai/knowledge-base?page_size=100", "documents");
    const knowledge = [];
    for (const doc of preview.knowledgeDocuments) {
      const found = existingDocs.find((d) => d.name === doc.name && d.type === "text");
      if (found) knowledge.push({ id: found.id, name: found.name, action: "reused" });
      else {
        const created = await api("/convai/knowledge-base/text", { method: "POST", body: JSON.stringify(doc) });
        knowledge.push({ id: created.id, name: doc.name, action: "created" });
      }
    }

    // TODO(starter): existing tools are reused by name, not updated. Changing a tool
    // definition currently needs a manual update in ElevenLabs (kit/lessons-learned.md #10).
    const existingTools = await listAll("/convai/tools?page_size=100", "tools");
    const tools = [];
    for (const def of preview.toolDefinitions) {
      const found = existingTools.find((t) => t.tool_config?.type === "client" && t.tool_config?.name === def.name);
      if (found) {
        tools.push({ id: found.id, name: def.name, action: "reused" });
        continue;
      }
      const { module: _module, ...definition } = def;
      const created = await api("/convai/tools", {
        method: "POST",
        body: JSON.stringify({
          tool_config: {
            type: "client",
            name: definition.name,
            description: definition.description,
            expects_response: definition.expects_response,
            response_timeout_secs: 12,
            interruption_mode: "allow",
            pre_tool_speech: "auto",
            execution_mode: definition.execution_mode ?? "immediate",
            ...(definition.parameters ? { parameters: definition.parameters } : {}),
          },
        }),
      });
      tools.push({ id: created.id, name: def.name, action: "created" });
    }

    const agentName = preview.agentPayload.name;
    const agents = await listAll("/convai/agents?page_size=100", "agents");
    const existingAgent = agents.find((a) => a.name === agentName);
    const existingConfig = existingAgent
      ? await api(`/convai/agents/${encodeURIComponent(existingAgent.agent_id)}`)
      : null;
    const rendered = renderAgentPayload(config, templates, {
      envVoiceId,
      existingTts: existingConfig?.conversation_config?.tts ?? {},
      toolIds: tools.map((t) => t.id),
      knowledge,
    });
    let agentId;
    let action;
    if (existingAgent) {
      agentId = existingAgent.agent_id;
      await api(`/convai/agents/${encodeURIComponent(agentId)}`, { method: "PATCH", body: JSON.stringify(rendered.agentPayload) });
      action = "updated";
    } else {
      const created = await api("/convai/agents/create", { method: "POST", body: JSON.stringify(rendered.agentPayload) });
      agentId = created.agent_id;
      action = "created";
    }
    const verified = await api(`/convai/agents/${encodeURIComponent(agentId)}`);
    const privacy = verified.platform_settings?.privacy ?? {};
    return {
      dryRun: false,
      agent: {
        id: agentId,
        action,
        authenticated: verified.platform_settings?.auth?.enable_auth === true,
        dailyLimit: verified.platform_settings?.call_limits?.daily_limit,
        audioRecordingDisabled: privacy.record_voice === false,
        retentionDays: privacy.retention_days,
        voiceSource: rendered.voiceSource,
      },
      knowledge: knowledge.map(({ name, action }) => ({ name, action })),
      tools: tools.map(({ name, action }) => ({ name, action })),
    };
  } catch (error) {
    throw new Error(redact(error?.message ?? "provision_failed", apiKey));
  }
}

function parseArgs(argv) {
  const args = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--config") args.config = argv[++i];
    else if (a === "--templates") args.templates = argv[++i];
    else throw new Error(`unknown argument: ${a}`);
  }
  if (args.apply && args.dryRun) throw new Error("--apply and --dry-run are mutually exclusive");
  if (!args.config || !args.templates) throw new Error("usage: provision.mjs --config <site.config.mjs> --templates <agent dir> [--dry-run|--apply]");
  return args;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const config = (await import(pathToFileURL(path.resolve(args.config)).href)).default;
    const templates = await loadAgentTemplates(path.resolve(args.templates));
    const result = await provisionAgent({
      config,
      templates,
      apply: args.apply,
      apiKey: args.apply ? process.env.ELEVENLABS_API_KEY : undefined,
      envVoiceId: process.env.ELEVENLABS_VOICE_ID,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${redact(error?.message ?? "provision_failed", process.env.ELEVENLABS_API_KEY)}\n`);
    process.exitCode = 1;
  }
}
