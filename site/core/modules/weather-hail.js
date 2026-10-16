// OPTIONAL MODULE (off by default; enable with config.modules.weatherHail.enabled = true).
// Consent-gated official weather context: U.S. Census Geocoder -> NOAA/NCEI SWDI
// NEXRAD Level-III filtered hail signatures (nx3hail). Ported from the Painless
// reference worker. Radar-derived signals are probable conditions, never proof of
// impact, damage, a date of loss, claim eligibility or coverage.
//
// The browser client tool must obtain explicit visitor consent before calling this
// endpoint (see core/agent/tool-registry.mjs: lookup_official_weather_context).
import { json, readBoundedJson, BodyTooLargeError, safeResponseJson, fetchSignalOptions } from "../worker/http.js";

export const WEATHER_EVIDENCE_PATH = "/api/weather/evidence";
const NOAA_SWDI_ROOT = "https://www.ncei.noaa.gov/swdiws/json/nx3hail";
const CENSUS_GEOCODER_ROOT = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const MAX_PROVIDER_REPLY_BYTES = 2_000_000;
function formatUtcDate(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function parsePoint(shape) {
  const match = /^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i.exec(String(shape ?? ""));
  if (!match) return null;
  return { longitude: Number(match[1]), latitude: Number(match[2]) };
}

function haversineMiles(from, to) {
  const radians = (value) => value * Math.PI / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildHailSignals(records, property, radiusMiles) {
  const withinRadius = records
    .map((record) => {
      const point = parsePoint(record.SHAPE);
      const time = new Date(record.ZTIME);
      if (!point || Number.isNaN(time.valueOf())) return null;
      return {
        record,
        point,
        time,
        distanceMiles: haversineMiles(property, point),
      };
    })
    .filter((entry) => entry && entry.distanceMiles <= radiusMiles)
    .sort((a, b) => a.time - b.time);

  const grouped = new Map();
  for (const entry of withinRadius) {
    const day = entry.time.toISOString().slice(0, 10);
    const key = `${entry.record.WSR_ID || "unknown"}:${entry.record.CELL_ID || "unknown"}:${day}`;
    const current = grouped.get(key);
    const size = Number(entry.record.MAXSIZE);
    const probability = Number(entry.record.PROB);
    const severeProbability = Number(entry.record.SEVPROB);

    if (!current) {
      grouped.set(key, {
        signalId: `${key}:${entry.time.toISOString()}`,
        radarSiteId: entry.record.WSR_ID || "Unknown",
        cellId: entry.record.CELL_ID || "Unknown",
        firstObservedUtc: entry.time.toISOString(),
        lastObservedUtc: entry.time.toISOString(),
        nearestDistanceMiles: entry.distanceMiles,
        nearestLatitude: entry.point.latitude,
        nearestLongitude: entry.point.longitude,
        maxSizeIn: Number.isFinite(size) ? size : null,
        hailProbabilityPercent: Number.isFinite(probability) ? probability : null,
        severeHailProbabilityPercent: Number.isFinite(severeProbability) ? severeProbability : null,
        sampleCount: 1,
      });
      continue;
    }

    current.lastObservedUtc = entry.time.toISOString();
    current.sampleCount += 1;
    if (entry.distanceMiles < current.nearestDistanceMiles) {
      current.nearestDistanceMiles = entry.distanceMiles;
      current.nearestLatitude = entry.point.latitude;
      current.nearestLongitude = entry.point.longitude;
    }
    if (Number.isFinite(size)) current.maxSizeIn = Math.max(current.maxSizeIn ?? size, size);
    if (Number.isFinite(probability)) current.hailProbabilityPercent = Math.max(current.hailProbabilityPercent ?? probability, probability);
    if (Number.isFinite(severeProbability)) current.severeHailProbabilityPercent = Math.max(current.severeHailProbabilityPercent ?? severeProbability, severeProbability);
  }

  return {
    rawRecordCount: withinRadius.length,
    signals: [...grouped.values()]
      .sort((a, b) => a.nearestDistanceMiles - b.nearestDistanceMiles || a.firstObservedUtc.localeCompare(b.firstObservedUtc))
      .slice(0, 8)
      .map((signal) => ({
        ...signal,
        nearestDistanceMiles: Number(signal.nearestDistanceMiles.toFixed(1)),
        nearestLatitude: Number(signal.nearestLatitude.toFixed(5)),
        nearestLongitude: Number(signal.nearestLongitude.toFixed(5)),
      })),
  };
}

export async function handleWeatherEvidenceRequest(request, fetchImpl = fetch) {
  if (request.method !== "POST") {
    return json({ ready: false, code: "method_not_allowed" }, 405, { allow: "POST" });
  }

  let payload;
  try {
    payload = await readBoundedJson(request, 4_000);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return json({ ready: false, code: "request_too_large" }, 413);
    return json({ ready: false, code: "invalid_json" }, 400);
  }

  const address = String(payload?.address ?? "").trim();
  const candidateDate = String(payload?.candidateDate ?? "").trim();
  const radiusMiles = Number(payload?.radiusMiles);
  const allowedRadii = new Set([5, 10, 15, 25]);
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const parsedDate = datePattern.test(candidateDate) ? new Date(`${candidateDate}T12:00:00Z`) : new Date(Number.NaN);
  const todayIso = new Date().toISOString().slice(0, 10);

  if (address.length < 8 || address.length > 180) {
    return json({ ready: false, code: "address_required" }, 400);
  }
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== candidateDate) {
    return json({ ready: false, code: "candidate_date_invalid" }, 400);
  }
  if (candidateDate > todayIso || candidateDate < "1992-05-07") {
    return json({ ready: false, code: "candidate_date_out_of_range" }, 400);
  }
  if (!allowedRadii.has(radiusMiles)) {
    return json({ ready: false, code: "radius_invalid" }, 400);
  }

  const geocodeUrl = new URL(CENSUS_GEOCODER_ROOT);
  geocodeUrl.searchParams.set("address", address);
  geocodeUrl.searchParams.set("benchmark", "Public_AR_Current");
  geocodeUrl.searchParams.set("format", "json");

  let geocodeResponse;
  try {
    geocodeResponse = await fetchImpl(geocodeUrl, { redirect: "error", ...fetchSignalOptions(8_000), headers: { accept: "application/json" } });
  } catch {
    return json({ ready: false, code: "census_geocoder_unreachable" }, 502);
  }
  if (!geocodeResponse.ok) return json({ ready: false, code: "census_geocoder_unavailable" }, 502);

  const geocodePayload = await safeResponseJson(geocodeResponse, MAX_PROVIDER_REPLY_BYTES);
  if (geocodePayload === null) return json({ ready: false, code: "census_geocoder_invalid_response" }, 502);
  const match = geocodePayload?.result?.addressMatches?.[0];
  const property = {
    longitude: Number(match?.coordinates?.x),
    latitude: Number(match?.coordinates?.y),
  };
  if (!Number.isFinite(property.latitude) || !Number.isFinite(property.longitude)) {
    return json({ ready: false, code: "address_not_matched" }, 404);
  }

  const latitudeDelta = radiusMiles / 69;
  const longitudeDelta = radiusMiles / Math.max(20, 69 * Math.cos(property.latitude * Math.PI / 180));
  const bbox = [
    property.longitude - longitudeDelta,
    property.latitude - latitudeDelta,
    property.longitude + longitudeDelta,
    property.latitude + latitudeDelta,
  ].map((value) => value.toFixed(5)).join(",");
  const previousDay = new Date(parsedDate);
  previousDay.setUTCDate(previousDay.getUTCDate() - 1);
  const nextDay = new Date(parsedDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const swdiUrl = new URL(`${NOAA_SWDI_ROOT}/${formatUtcDate(previousDay)}:${formatUtcDate(nextDay)}`);
  swdiUrl.searchParams.set("bbox", bbox);

  let swdiResponse;
  try {
    swdiResponse = await fetchImpl(swdiUrl, { redirect: "error", ...fetchSignalOptions(10_000), headers: { accept: "application/json" } });
  } catch {
    return json({ ready: false, code: "noaa_swdi_unreachable" }, 502);
  }
  if (!swdiResponse.ok) return json({ ready: false, code: "noaa_swdi_unavailable" }, 502);

  const swdiPayload = await safeResponseJson(swdiResponse, MAX_PROVIDER_REPLY_BYTES);
  if (swdiPayload === null) return json({ ready: false, code: "noaa_swdi_invalid_response" }, 502);
  const records = Array.isArray(swdiPayload?.result) ? swdiPayload.result : [];
  const evidence = buildHailSignals(records, property, radiusMiles);

  return json({
    ready: true,
    code: evidence.signals.length ? "official_weather_signals_found" : "no_official_weather_signals_found",
    candidateDate,
    searchedUtcRange: {
      start: previousDay.toISOString().slice(0, 10),
      end: nextDay.toISOString().slice(0, 10),
    },
    radiusMiles,
    property: {
      matchedAddress: match.matchedAddress,
      latitude: Number(property.latitude.toFixed(5)),
      longitude: Number(property.longitude.toFixed(5)),
      geocoder: "U.S. Census Geocoder — Public_AR_Current",
      geocoderUrl: geocodeUrl.toString(),
    },
    source: {
      provider: "NOAA National Centers for Environmental Information",
      dataset: "SWDI NEXRAD Level-III Filtered Hail Signatures (nx3hail)",
      queryUrl: swdiUrl.toString(),
      retrievedAt: new Date().toISOString(),
      evidenceClass: "radar-derived probable conditions",
    },
    rawRecordCount: evidence.rawRecordCount,
    signalCount: evidence.signals.length,
    signals: evidence.signals,
    limitations: [
      "Radar-derived hail signatures indicate probable conditions and do not prove impact at a specific property.",
      "The absence of a result does not mean severe weather did not occur.",
      "This context cannot determine property damage, a date of loss, claim eligibility, or insurance coverage.",
    ],
  });
}
