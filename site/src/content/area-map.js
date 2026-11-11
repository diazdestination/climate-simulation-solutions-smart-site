// The communities Climate Simulation Solutions serves, and where each one sits on the map.
//
// 2026-11-11 (Adam): CSS serves every town listed here. Before that date these were "call to
// check availability" names; see DECISIONS.md. This file is the one place a town is added or
// removed: the homepage map, the service-area index and each town's own page are generated
// from it.
//
// Coordinates are each town's published center (degrees north, degrees east). The map is a plain
// flat projection around Dawsonville, accurate to about a mile at this scale. `county` and
// `place` are plain geography, written to be checkable on any map. They are not marketing
// claims, and nothing here states a response time.
export const HOME_BASE = {
  name: "Dawsonville", slug: "dawsonville-ga", lat: 34.4212, lon: -84.1191,
  county: "Dawson County",
  place: "Dawsonville is the Dawson County seat and the home base of Climate Simulation Solutions.",
};

// Order is the order the towns are listed on the site. `label` is which side of the dot the
// name sits on, chosen so names never collide on the map.
export const MAP_TOWNS = [
  { name: "Dahlonega", lat: 34.5326, lon: -83.9849, label: "right", county: "Lumpkin County", place: "Dahlonega is the Lumpkin County seat, in the foothills northeast of Dawsonville." },
  { name: "Cumming", lat: 34.2073, lon: -84.1402, label: "right", county: "Forsyth County", place: "Cumming is the Forsyth County seat, down Georgia 400 from Dawsonville." },
  { name: "Gainesville", lat: 34.2979, lon: -83.8241, label: "right", county: "Hall County", place: "Gainesville is the Hall County seat, on the shore of Lake Lanier." },
  { name: "Jasper", lat: 34.4679, lon: -84.4291, label: "left", county: "Pickens County", place: "Jasper is the Pickens County seat, in the foothills west of Dawsonville." },
  { name: "Ball Ground", lat: 34.3381, lon: -84.3766, label: "left", county: "Cherokee County", place: "Ball Ground sits at the northern end of Cherokee County." },
  { name: "Canton", lat: 34.2368, lon: -84.4908, label: "left", county: "Cherokee County", place: "Canton is the Cherokee County seat, on the Etowah River." },
  { name: "Buford", lat: 34.1207, lon: -84.0044, label: "right", county: "Gwinnett and Hall counties", place: "Buford straddles Gwinnett and Hall counties near the south end of Lake Lanier." },
  { name: "Alpharetta", lat: 34.0754, lon: -84.2941, label: "left", county: "Fulton County", place: "Alpharetta is in north Fulton County, along Georgia 400." },
  { name: "Cleveland", lat: 34.597, lon: -83.7632, label: "left", county: "White County", place: "Cleveland is the White County seat, in the northeast Georgia mountains." },
  { name: "Roswell", lat: 34.0232, lon: -84.3616, label: "left", county: "Fulton County", place: "Roswell is in north Fulton County, along the Chattahoochee River." },
  { name: "Johns Creek", lat: 34.0289, lon: -84.1986, label: "right", county: "Fulton County", place: "Johns Creek is in northeast Fulton County, between Alpharetta and Duluth." },
  { name: "Atlanta", lat: 33.749, lon: -84.388, label: "right", county: "Fulton and DeKalb counties", place: "Atlanta is the farthest community we serve from our Dawsonville base." },
].map((town) => ({ ...town, slug: `${town.name.toLowerCase().replaceAll(" ", "-")}-ga` }));

export const RING_MILES = [10, 25, 50];

const MILES_PER_DEGREE_LAT = 69.0;
const milesPerDegreeLon = (lat) => 69.17 * Math.cos((lat * Math.PI) / 180);

/** Miles east and north of `base` (negative means west or south). */
export function offsetMiles(town, base = HOME_BASE) {
  return {
    east: (town.lon - base.lon) * milesPerDegreeLon(base.lat),
    north: (town.lat - base.lat) * MILES_PER_DEGREE_LAT,
  };
}

/** Straight-line miles between a town and `base` (Dawsonville unless told otherwise). */
export function milesFromBase(town, base = HOME_BASE) {
  const { east, north } = offsetMiles(town, base);
  return Math.hypot(east, north);
}

/** "about 15 miles from our base in Dawsonville" (straight line, rounded to the mile). */
export function whereFromBase(town) {
  return `about ${Math.round(milesFromBase(town))} miles from our base in ${HOME_BASE.name}`;
}

/** The served towns closest to `town`, nearest first (never the town itself). */
export function nearestTowns(town, count = 3) {
  return MAP_TOWNS.filter((other) => other.slug !== town.slug)
    .map((other) => ({ other, miles: milesFromBase(other, town) }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, count)
    .map(({ other }) => other);
}
