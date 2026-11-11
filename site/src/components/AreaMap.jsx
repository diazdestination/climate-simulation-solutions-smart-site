import { HOME_BASE, MAP_TOWNS, RING_MILES, milesFromBase, offsetMiles } from "../content/area-map.js";

// A real map, not a decoration: every town sits at its true bearing and distance from
// Dawsonville, north is up, and the rings are 10, 25 and 50 miles. The frame is taller than it
// is wide because the service area runs from the mountains south to Atlanta.
const WIDTH = 620;
const HEIGHT = 680;
const CX = 310;
const CY = 170;
const PX_PER_MILE = 9.5;
// Compass bearing (degrees clockwise from north) where each ring's label sits, chosen to stay
// clear of town names. The 50-mile ring only shows inside the frame to the south.
const RING_LABEL_BEARING = { 10: 135, 25: 135, 50: 180 };

const place = (town) => {
  const { east, north } = offsetMiles(town);
  return [CX + east * PX_PER_MILE, CY - north * PX_PER_MILE];
};
const onRing = (miles) => {
  const rad = ((RING_LABEL_BEARING[miles] ?? 135) * Math.PI) / 180;
  return [CX + Math.sin(rad) * miles * PX_PER_MILE, CY - Math.cos(rad) * miles * PX_PER_MILE];
};

/**
 * @param {{ highlight?: string }} props `highlight` is the slug of one town to pick out (used
 * on that town's own page); the rest of the map is dimmed around it.
 */
export function AreaMap({ highlight }) {
  const here = MAP_TOWNS.find((town) => town.slug === highlight);
  const summary = here
    ? `Map showing ${here.name} about ${Math.round(milesFromBase(here))} miles from ${HOME_BASE.name}, with rings at ${RING_MILES.join(", ")} miles and the other communities served.`
    : `Map centered on ${HOME_BASE.name} with rings at ${RING_MILES.join(", ")} miles. ${MAP_TOWNS.map((t) => `${t.name} is about ${Math.round(milesFromBase(t))} miles away`).join("; ")}.`;
  return (
    <figure className={`area-map${here ? " area-map--focus" : ""}`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary}>
        <defs>
          <clipPath id="area-map-frame"><rect x="0" y="0" width={WIDTH} height={HEIGHT} /></clipPath>
        </defs>
        <g className="area-map__rings" clipPath="url(#area-map-frame)">
          {RING_MILES.map((miles) => <circle key={miles} cx={CX} cy={CY} r={miles * PX_PER_MILE} />)}
        </g>
        <g className="area-map__ring-labels">
          {RING_MILES.map((miles) => {
            const [x, y] = onRing(miles);
            return (
              <g key={miles}>
                <rect x={x - 24} y={y - 10} width="48" height="20" />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central">{`${miles} mi`}</text>
              </g>
            );
          })}
        </g>
        <g className="area-map__spokes">
          {MAP_TOWNS.map((town) => {
            const [x, y] = place(town);
            return <line key={town.slug} className={town === here ? "is-here" : undefined} x1={CX} y1={CY} x2={x} y2={y} />;
          })}
        </g>
        <g className="area-map__towns">
          {MAP_TOWNS.map((town) => {
            const [x, y] = place(town);
            const left = town.label === "left";
            return (
              <g key={town.slug} className={town === here ? "is-here" : undefined}>
                {town === here && <circle className="area-map__halo" cx={x} cy={y} r="16" />}
                <circle cx={x} cy={y} r={town === here ? 7 : 4.5} />
                <text x={x + (left ? -12 : 12)} y={y} textAnchor={left ? "end" : "start"} dominantBaseline="central">{town.name}</text>
              </g>
            );
          })}
        </g>
        <g className="area-map__base">
          <circle className="area-map__halo" cx={CX} cy={CY} r="17" />
          <circle cx={CX} cy={CY} r="7" />
          <text x={CX + 15} y={CY - 20} dominantBaseline="central">{HOME_BASE.name}</text>
        </g>
        <g className="area-map__north" transform={`translate(${WIDTH - 46}, 44)`}>
          <path d="M0 -20 L7 6 L0 1 L-7 6 Z" />
          <text x="0" y="24" textAnchor="middle">N</text>
        </g>
      </svg>
      <figcaption>
        {here
          ? `${here.name} is about ${Math.round(milesFromBase(here))} miles from ${HOME_BASE.name} in a straight line.`
          : `Straight-line distances from our base in ${HOME_BASE.name}.`}
      </figcaption>
    </figure>
  );
}
