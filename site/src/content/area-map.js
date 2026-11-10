// Positions for the homepage service-area map. Coordinates are each town's published center
// (degrees north, degrees east). The map is a plain flat projection around Dawsonville, which is
// accurate to well under a mile at this scale. Being on the map means "call to check
// availability", exactly as on the service-area page. It is not a promise of coverage.
export const HOME_BASE = { name: "Dawsonville", lat: 34.4212, lon: -84.1191 };

// `label` is which side of the dot the name sits on, chosen so names never collide.
export const MAP_TOWNS = [
  { name: "Dahlonega", lat: 34.5326, lon: -83.9849, label: "right" },
  { name: "Cumming", lat: 34.2083, lon: -84.1375, label: "right" },
  { name: "Gainesville", lat: 34.3044, lon: -83.8339, label: "right" },
  { name: "Jasper", lat: 34.468, lon: -84.434, label: "left" },
  { name: "Ball Ground", lat: 34.3386, lon: -84.3769, label: "left" },
  { name: "Canton", lat: 34.2272, lon: -84.4947, label: "right" },
  { name: "Buford", lat: 34.1189, lon: -84.0033, label: "right" },
  { name: "Alpharetta", lat: 34.0733, lon: -84.28, label: "left" },
];

export const RING_MILES = [10, 20, 30];

const MILES_PER_DEGREE_LAT = 69.0;
const milesPerDegreeLon = (lat) => 69.17 * Math.cos((lat * Math.PI) / 180);

/** Miles east and north of Dawsonville (negative means west or south). */
export function offsetMiles(town, base = HOME_BASE) {
  return {
    east: (town.lon - base.lon) * milesPerDegreeLon(base.lat),
    north: (town.lat - base.lat) * MILES_PER_DEGREE_LAT,
  };
}

/** Straight-line miles from Dawsonville. */
export function milesFromBase(town, base = HOME_BASE) {
  const { east, north } = offsetMiles(town, base);
  return Math.hypot(east, north);
}
