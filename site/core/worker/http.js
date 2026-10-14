// Runtime-neutral HTTP helpers (Web Request/Response/fetch/crypto only).

export const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      ...extraHeaders,
    },
  });
}

/** Some worker runtimes lack AbortSignal.timeout; degrade to no timeout rather than throwing. */
export function fetchSignalOptions(timeoutMs) {
  if (
    typeof AbortSignal === "undefined" ||
    typeof AbortSignal.timeout !== "function"
  )
    return {};
  return { signal: AbortSignal.timeout(timeoutMs) };
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
export function isLoopbackHostname(hostname) {
  return LOOPBACK.has(String(hostname ?? "").toLowerCase());
}
export function isLoopbackRequest(request) {
  return isLoopbackHostname(new URL(request.url).hostname);
}

export class BodyTooLargeError extends Error {
  constructor() {
    super("request_too_large");
  }
}

/**
 * Reads at most maxBytes from a Request/Response body. Measures the actual stream:
 * chunked bodies carry no Content-Length to trust.
 */
export async function readBoundedBytes(message, maxBytes) {
  const declared = Number(message.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes)
    throw new BodyTooLargeError();
  if (!message.body) return new Uint8Array(0);
  const reader = message.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      void reader.cancel().catch(() => {});
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readBoundedText(message, maxBytes) {
  const bytes = await readBoundedBytes(message, maxBytes);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** Parses JSON from a bounded body. Throws BodyTooLargeError or SyntaxError. */
export async function readBoundedJson(message, maxBytes) {
  let text;
  try {
    text = await readBoundedText(message, maxBytes);
  } catch (error) {
    if (error instanceof BodyTooLargeError) throw error;
    throw new SyntaxError("invalid_utf8");
  }
  return JSON.parse(text);
}

/** Provider replies: never throws; returns null for oversized, empty or non-JSON bodies. */
export async function safeResponseJson(response, maxBytes = 16_000) {
  try {
    return await readBoundedJson(response, maxBytes);
  } catch {
    return null;
  }
}

/** Browser-facing write endpoints accept only same-origin requests. */
export function isCrossSite(request, { requireOriginHeader = false } = {}) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  if (!origin) return requireOriginHeader;
  return origin !== new URL(request.url).origin;
}
