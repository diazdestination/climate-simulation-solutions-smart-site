// The homepage's scroll-driven illustration: a heating and cooling unit that comes together as
// the visitor scrolls. The frames are made from media/system-assembly.mp4 by
// scripts/make-scroll-frames.py; when the clip changes, re-run the script and copy the numbers
// it prints into ASSEMBLY (tests/scroll-assembly.test.mjs fails until they match the files).
export const ASSEMBLY = {
  frames: 85,
  base: "/assets/assembly",
  poster: "/assets/assembly/poster.webp",
  sets: {
    full: { width: 720, height: 1280 },
    phone: { width: 480, height: 853 },
  },
};

export const frameUrl = (set, index) => `${ASSEMBLY.base}/${set}/${String(index).padStart(3, "0")}.webp`;

// What the picture is, said plainly, because the clip is an illustration and not a diagram.
export const ASSEMBLY_ALT =
  "Illustration of an outdoor heating and cooling unit with its parts separated: compressors, a fan, coils and copper refrigerant lines.";
export const ASSEMBLY_NOTE = "An illustration, not a diagram of your equipment.";

// Three captions, in the order the clip shows them. `from` is how far through the scroll (0 to 1)
// each one takes over; the values follow the clip: parts appear, lines connect, the cabinet closes.
// `fromStacked` is the same thing for the one-column layout (tablets and phones), where only the
// current caption is shown, under the picture. There a caption cannot be read until the section
// has finished sliding into place, so each one has to stay current for a good stretch of the
// pinned scroll. With the wide layout's values the first caption was over before a phone visitor
// could see it (found in the first production check, 2026-11-13).
// General statements only: nothing here is a price, a promise or a claim about a visit.
export const ASSEMBLY_STAGES = [
  {
    from: 0,
    fromStacked: 0,
    title: "The parts that move heat",
    text: "In a central air conditioner or heat pump, a compressor, a fan and two coils do the heavy work.",
  },
  {
    from: 0.36,
    fromStacked: 0.43,
    title: "The lines between them",
    text: "Refrigerant lines and wiring connect those parts. A small leak or a loose connection can stop the whole system.",
  },
  {
    from: 0.58,
    fromStacked: 0.72,
    title: "One cabinet outside",
    text: "Closed up, it is a metal box that is easy to forget about. A maintenance visit is when someone opens it and looks.",
    link: { href: "/maintenance-plans/", label: "See maintenance plans" },
  },
];

/** Which caption is current at scroll progress p (0 to 1), in the wide or the stacked layout. */
export const stageAt = (p, stacked = false) => {
  let current = 0;
  ASSEMBLY_STAGES.forEach((stage, index) => {
    if (p >= (stacked ? stage.fromStacked : stage.from)) current = index;
  });
  return current;
};

// How far down the screen the track's top is when the frames start to play, as a share of the
// screen's height. Wide: half a screen, so the unit is already forming as it rises into place
// beside captions that are all visible. Stacked: a quarter, so less of the clip is spent before
// the picture and its one caption have arrived.
export const LEAD = { wide: 0.5, stacked: 0.25 };

/** The order frames are fetched in: both ends first, then ever finer steps, so a visitor who
 *  scrolls before everything has arrived still sees the whole motion, just in fewer steps. */
export const loadOrder = (count) => {
  const order = [0, count - 1];
  const seen = new Set(order);
  for (const step of [12, 6, 3, 1]) {
    for (let i = 0; i < count; i += step) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  return order;
};

/** The loaded frame closest to `index`, or -1 when none has arrived yet. */
export const nearestLoaded = (loaded, index) => {
  for (let offset = 0; offset < loaded.length; offset += 1) {
    if (loaded[index - offset]) return index - offset;
    if (loaded[index + offset]) return index + offset;
  }
  return -1;
};

/** Scroll progress through the pinned track, 0 to 1. It starts while the track is still rising
 *  into view (its top `leadShare` of a screen down) and finishes a little before the pin lets
 *  go, so the closed cabinet is held for a moment. */
export const progressFor = (trackTop, trackHeight, viewportHeight, leadShare = LEAD.wide) => {
  const lead = viewportHeight * leadShare;
  const distance = trackHeight - viewportHeight + lead;
  if (distance <= 0) return 1;
  return Math.min(1, Math.max(0, (lead - trackTop) / distance / 0.94));
};
