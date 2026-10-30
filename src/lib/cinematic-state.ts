// Shared, mutable state bridging GSAP ScrollTrigger (DOM) and the WebGL scene.
// Mutated at scroll frequency; read inside the render loop. Not React state on purpose.
export const cinematic = {
  /** 0..1 progress through the cinematic stage. */
  progress: 0,
  /** Normalized pointer position, -1..1 on both axes. */
  pointer: { x: 0, y: 0 },
};

/**
 * Maps stage progress to the thermal "heat" of the scene.
 * 0 = cold (cooling chapter), 1 = warm (heating chapter), settles balanced.
 */
export function heatForProgress(p: number): number {
  const keys: Array<[number, number]> = [
    [0, 0.18],
    [0.3, 0],
    [0.62, 1],
    [1, 0.42],
  ];
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p1, h1] = keys[i];
    if (p <= p1) {
      const [p0, h0] = keys[i - 1];
      const t = (p - p0) / (p1 - p0);
      const s = t * t * (3 - 2 * t);
      return h0 + (h1 - h0) * s;
    }
  }
  return keys[keys.length - 1][1];
}
