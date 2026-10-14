// Server-only ElevenLabs boundary: exchanges the server API key for a short-lived
// signed URL (WebSocket) or conversation token (WebRTC), and proxies user-chosen
// evidence files into a conversation. Ported from the Painless reference worker.
//
// Private by default: session/token/file endpoints answer 403 off loopback unless
// BOTH config.voice.public === true AND env ELEVENLABS_VOICE_PUBLIC === "true".
// Do not enable public voice before bot protection, per-IP limits and provider caps
// are verified (kit/lessons-learned.md #9).
import {
  json,
  isLoopbackRequest,
  fetchSignalOptions,
  readBoundedBytes,
  safeResponseJson,
  BodyTooLargeError,
} from "./http.js";

/**
 * Which assistant modes a site offers. Defaults keep both on (the original behavior); a site can
 * launch text-only with config.voice.modes = { text: true, voice: false } and switch voice on later.
 */
export function assistantModes(siteConfig) {
  const modes = siteConfig?.voice?.modes ?? {};
  return { text: modes.text !== false, voice: modes.voice !== false };
}

export const VOICE_PATHS = Object.freeze({
  status: "/api/elevenlabs/status",
  session: "/api/elevenlabs/session",
  token: "/api/elevenlabs/token",
  files: "/api/elevenlabs/files",
});
const API_ROOT = "https://api.elevenlabs.io/v1";
const ACCEPTED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_FILE_BYTES = 12 * 1024 * 1024;
// Multipart framing overhead on top of the file itself.
const MAX_UPLOAD_BYTES = MAX_FILE_BYTES + 64 * 1024;
const MAX_PROVIDER_REPLY_BYTES = 16_000;

export function voiceIsPublic(env, siteConfig) {
  return (
    siteConfig?.voice?.public === true && env?.ELEVENLABS_VOICE_PUBLIC === "true"
  );
}

function configured(env) {
  return Boolean(env?.ELEVENLABS_API_KEY) && Boolean(env?.ELEVENLABS_AGENT_ID);
}

export async function handleVoiceSessionRequest(
  request,
  env,
  siteConfig,
  fetchImpl = fetch,
) {
  if (request.method !== "GET")
    return json({ ready: false, code: "method_not_allowed" }, 405, {
      allow: "GET",
    });
  const url = new URL(request.url);
  const ready = configured(env);
  const localOnly = !voiceIsPublic(env, siteConfig);
  const modes = assistantModes(siteConfig);
  if (url.pathname === VOICE_PATHS.status)
    return json({
      ready,
      localOnly,
      modes,
      code: ready ? "voice_preview_ready" : "voice_agent_not_configured",
    });
  if (url.pathname !== VOICE_PATHS.session && url.pathname !== VOICE_PATHS.token)
    return json({ ready: false, code: "not_found" }, 404);
  // The WebRTC token is only for spoken sessions; text chat uses the signed URL.
  if (url.pathname === VOICE_PATHS.token && !modes.voice)
    return json({ ready: false, code: "voice_mode_disabled" }, 404);
  if (url.pathname === VOICE_PATHS.session && !modes.text)
    return json({ ready: false, code: "text_mode_disabled" }, 404);
  if (localOnly && !isLoopbackRequest(request))
    return json({ ready: false, code: "voice_preview_local_only" }, 403);
  if (!ready)
    return json({ ready: false, code: "voice_agent_not_configured" }, 503);

  const isToken = url.pathname === VOICE_PATHS.token;
  const providerEndpoint = new URL(
    isToken
      ? `${API_ROOT}/convai/conversation/token`
      : `${API_ROOT}/convai/conversation/get-signed-url`,
  );
  providerEndpoint.searchParams.set("agent_id", env.ELEVENLABS_AGENT_ID);
  let providerResponse;
  try {
    providerResponse = await fetchImpl(providerEndpoint, {
      method: "GET",
      redirect: "error",
      ...fetchSignalOptions(8_000),
      headers: {
        accept: "application/json",
        "xi-api-key": env.ELEVENLABS_API_KEY,
      },
    });
  } catch {
    return json({ ready: false, code: "voice_provider_unreachable" }, 502);
  }
  if (!providerResponse.ok)
    return json({ ready: false, code: "voice_session_unavailable" }, 502);
  const payload = await safeResponseJson(
    providerResponse,
    MAX_PROVIDER_REPLY_BYTES,
  );
  if (isToken) {
    if (typeof payload?.token !== "string" || !payload.token)
      return json({ ready: false, code: "voice_session_invalid" }, 502);
    return json({ ready: true, conversationToken: payload.token });
  }
  if (
    typeof payload?.signed_url !== "string" ||
    !payload.signed_url.startsWith("wss://")
  )
    return json({ ready: false, code: "voice_session_invalid" }, 502);
  return json({ ready: true, signedUrl: payload.signed_url });
}

export async function handleVoiceFileRequest(
  request,
  env,
  siteConfig,
  fetchImpl = fetch,
) {
  if (request.method !== "POST")
    return json({ ready: false, code: "method_not_allowed" }, 405, {
      allow: "POST",
    });
  if (!voiceIsPublic(env, siteConfig) && !isLoopbackRequest(request))
    return json({ ready: false, code: "voice_preview_local_only" }, 403);
  if (siteConfig?.voice?.fileUploads === false)
    return json({ ready: false, code: "file_uploads_disabled" }, 403);
  if (!configured(env))
    return json({ ready: false, code: "voice_agent_not_configured" }, 503);
  const conversationId =
    new URL(request.url).searchParams.get("conversation_id")?.trim() || "";
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(conversationId))
    return json({ ready: false, code: "conversation_id_invalid" }, 400);

  let incoming;
  try {
    const bytes = await readBoundedBytes(request, MAX_UPLOAD_BYTES);
    incoming = await new Response(bytes, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch (error) {
    if (error instanceof BodyTooLargeError)
      return json({ ready: false, code: "file_too_large" }, 413);
    return json({ ready: false, code: "file_form_invalid" }, 400);
  }
  const file = incoming.get("file");
  if (!file || typeof file.arrayBuffer !== "function")
    return json({ ready: false, code: "file_required" }, 400);
  if (!ACCEPTED_FILE_TYPES.has(file.type) || file.size > MAX_FILE_BYTES)
    return json({ ready: false, code: "file_invalid" }, 400);

  const providerForm = new FormData();
  providerForm.append(
    "file",
    file,
    typeof file.name === "string" && file.name ? file.name : "evidence-upload",
  );
  let providerResponse;
  try {
    providerResponse = await fetchImpl(
      `${API_ROOT}/convai/conversations/${conversationId}/files`,
      {
        method: "POST",
        redirect: "error",
        ...fetchSignalOptions(20_000),
        headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
        body: providerForm,
      },
    );
  } catch {
    return json({ ready: false, code: "file_provider_unreachable" }, 502);
  }
  if (!providerResponse.ok)
    return json({ ready: false, code: "file_upload_unavailable" }, 502);
  const payload = await safeResponseJson(
    providerResponse,
    MAX_PROVIDER_REPLY_BYTES,
  );
  if (typeof payload?.file_id !== "string" || !payload.file_id)
    return json({ ready: false, code: "file_upload_invalid_response" }, 502);
  return json({ ready: true, fileId: payload.file_id });
}
