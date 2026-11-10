import { HOME_BASE, MAP_TOWNS, RING_MILES, milesFromBase, offsetMiles } from "../content/area-map.js";

// A real map, not a decoration: every town sits at its true bearing and distance from
// Dawsonville, north is up, and the rings are 10, 20 and 30 miles.
const WIDTH = 620;
const HEIGHT = 540;
const CX = 310;
const CY = 256;
const PX_PER_MILE = 8.2;

const place = (town) => {
  const { east, north } = offsetMiles(town);
  return [CX + east * PX_PER_MILE, CY - north * PX_PER_MILE];
};

export function AreaMap() {
  const summary = `Map centered on ${HOME_BASE.name} with rings at ${RING_MILES.join(", ")} miles. ${MAP_TOWNS.map((t) => `${t.name} is about ${Math.round(milesFromBase(t))} miles away`).join("; ")}.`;
  return (
    <figure className="area-map">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary}>
        <g className="area-map__rings">
          {RING_MILES.map((miles) => (
            <g key={miles}>
              <circle cx={CX} cy={CY} r={miles * PX_PER_MILE} />
              <rect x={CX - 24} y={CY - miles * PX_PER_MILE - 10} width="48" height="20" />
              <text x={CX} y={CY - miles * PX_PER_MILE} textAnchor="middle" dominantBaseline="central">{`${miles} mi`}</text>
            </g>
          ))}
        </g>
        <g className="area-map__spokes">
          {MAP_TOWNS.map((town) => {
            const [x, y] = place(town);
            return <line key={town.name} x1={CX} y1={CY} x2={x} y2={y} />;
          })}
        </g>
        <g className="area-map__towns">
          {MAP_TOWNS.map((town) => {
            const [x, y] = place(town);
            const left = town.label === "left";
            return (
              <g key={town.name}>
                <circle cx={x} cy={y} r="4.5" />
                <text x={x + (left ? -11 : 11)} y={y} textAnchor={left ? "end" : "start"} dominantBaseline="central">{town.name}</text>
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
      <figcaption>Straight-line distances from {HOME_BASE.name}. A town on the map is one you can call about, not a promise of service at every address.</figcaption>
    </figure>
  );
}
