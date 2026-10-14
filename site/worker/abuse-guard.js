// Bot protection / rate-limit hook for public write endpoints.
//
// TODO(core): Turnstile verification and per-IP rate limits are being added to
// smart-site-starter's core by Claude separately. When that lands, re-sync core/ and replace
// this pass-through with the core guard (keep this file as the single wiring point).
// Until then: GrowthOS stays the only lead sink, voice stays private (voice.public=false,
// ELEVENLABS_VOICE_PUBLIC=false), and no public route is attached in wrangler.jsonc.
//
// Contract: return null to continue, or a Response to short-circuit (e.g. 429 / 403).
export const GUARDED_PATHS = new Set(["/api/lead", "/api/acquisition/events", "/api/elevenlabs/session", "/api/elevenlabs/token", "/api/elevenlabs/files"]);

export async function abuseGuard(request /*, env, ctx */) {
  const { pathname } = new URL(request.url);
  if (!GUARDED_PATHS.has(pathname) || request.method === "GET") return null;
  return null; // pass-through until the core guard ships
}
