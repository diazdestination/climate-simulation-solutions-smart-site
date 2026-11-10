// GET /api/outdoor — the current outdoor temperature for Dawsonville, for the homepage hero.
//
// Client-owned (not managed by sync-core). The worker asks the National Weather Service for the
// hourly forecast and returns one number. The visitor's browser only ever talks to this site:
// no visitor IP, header or cookie is forwarded to weather.gov, so this adds no third-party data
// flow. The hero works without this route (it falls back to a season line), which matters while
// production still runs an older server module.
const DAWSONVILLE_HOURLY = "https://api.weather.gov/gridpoints/FFC/58,117/forecast/hourly";
const USER_AGENT = "csshvac.com homepage (Climate Simulation Solutions, Dawsonville GA)";
const MAX_AGE_SECONDS = 900;

const json = (status, body, cache) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache, "x-content-type-options": "nosniff" },
  });

/** Picks the forecast period covering `now`, or the first one if none does. */
export function currentPeriod(periods, now = Date.now()) {
  if (!Array.isArray(periods) || !periods.length) return null;
  return periods.find((p) => Date.parse(p.startTime) <= now && now < Date.parse(p.endTime)) ?? periods[0];
}

export async function outdoorResponse({ fetchImpl = fetch, now = Date.now() } = {}) {
  try {
    const upstream = await fetchImpl(DAWSONVILLE_HOURLY, {
      headers: { accept: "application/geo+json", "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(4000),
    });
    if (!upstream.ok) return json(503, { error: "outdoor_unavailable" }, "no-store");
    const period = currentPeriod((await upstream.json())?.properties?.periods, now);
    const tempF = period?.temperatureUnit === "F" ? Number(period.temperature) : NaN;
    if (!Number.isFinite(tempF) || tempF < -40 || tempF > 130) return json(503, { error: "outdoor_unavailable" }, "no-store");
    return json(200, { tempF: Math.round(tempF), place: "Dawsonville", source: "National Weather Service", asOf: period.startTime }, `public, max-age=${MAX_AGE_SECONDS}`);
  } catch {
    return json(503, { error: "outdoor_unavailable" }, "no-store");
  }
}

export const isOutdoorRequest = (request) => request.method === "GET" && new URL(request.url).pathname === "/api/outdoor";
