import { useEffect, useRef } from "react";

// Air moving through the hero. Room air drifts in from the left, bends around the thermostat
// (potential flow around a cylinder) and leaves conditioned: amber and rising while the system
// heats, blue and sinking while it cools, pale and slow once the room holds its set point.
//
// Decorative only (aria-hidden). It pauses when the hero is off screen or the tab is hidden, and
// draws one still frame instead of animating for visitors who ask for reduced motion.
const ROOM_AIR = [164, 190, 214];
const WARM_AIR = [255, 158, 44];
const COOL_AIR = [86, 209, 250];
const BACKDROP = "7, 23, 47";

const mix = (a, b, t) => a + (b - a) * t;
const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * @param {{ mode: "heating" | "cooling" | "holding", resting?: number, obstacleRef: { current: Element | null } }} props
 * `obstacleRef` is the thermostat element the air bends around. `resting` (-1 cool to 1 warm) is
 * the tint the air keeps while holding, so the page stays in season instead of going grey.
 */
export function Airflow({ mode, resting = 0, obstacleRef }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const goalFor = (m) => (m === "heating" ? 1 : m === "cooling" ? -1 : resting);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = 0;
    let height = 0;
    let disc = { x: 0, y: 0, r: 0 };
    let particles = [];
    let heat = goalFor(modeRef.current);
    let energy = modeRef.current === "holding" ? 0.5 : 1;
    let frame = 0;
    let raf = 0;
    let onScreen = true;

    const spawn = (anywhere) => ({
      x: anywhere ? Math.random() * width : -12,
      y: Math.random() * height,
      speed: 0.7 + Math.random() * 0.7,
      age: 0,
      life: 240 + Math.random() * 320,
    });

    const measure = () => {
      const box = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(box.width));
      height = Math.max(1, Math.round(box.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = obstacleRef?.current?.getBoundingClientRect();
      disc = target
        ? { x: target.left - box.left + target.width / 2, y: target.top - box.top + target.height / 2, r: (target.width / 2) * 1.04 }
        : { x: width * 0.72, y: height * 0.5, r: Math.min(width, height) * 0.2 };
      const count = Math.round(Math.min(520, Math.max(140, (width * height) / 3000)));
      particles = Array.from({ length: count }, () => spawn(true));
      ctx.fillStyle = `rgb(${BACKDROP})`;
      ctx.fillRect(0, 0, width, height);
    };

    const step = () => {
      heat += (goalFor(modeRef.current) - heat) * 0.04;
      energy += ((modeRef.current === "holding" ? 0.5 : 1) - energy) * 0.03;
      frame += 1;

      ctx.fillStyle = `rgba(${BACKDROP}, 0.035)`;
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 1.35;
      ctx.lineCap = "round";

      const tint = heat >= 0 ? WARM_AIR : COOL_AIR;
      const strength = Math.abs(heat);
      const r2 = disc.r * disc.r;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const dx = p.x - disc.x;
        const dy = p.y - disc.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2 * 1.02 || p.x > width + 12 || p.y < -12 || p.y > height + 12 || p.age > p.life) {
          particles[i] = spawn(false);
          continue;
        }
        const base = 1.5 * p.speed * energy;
        const k = r2 / (d2 * d2);
        const conditioned = smooth(disc.x - disc.r * 0.5, disc.x + disc.r * 1.5, p.x);
        const vx = base * (1 - k * (dx * dx - dy * dy));
        const vy = base * (-k * 2 * dx * dy) - heat * conditioned * 0.32 + Math.sin(p.y * 0.012 + p.x * 0.004 + frame * 0.01) * 0.12;
        const nx = p.x + vx;
        const ny = p.y + vy;

        const t = conditioned * strength;
        const fade = Math.min(1, p.age / 30) * Math.min(1, (p.life - p.age) / 60);
        ctx.strokeStyle = `rgba(${Math.round(mix(ROOM_AIR[0], tint[0], t))}, ${Math.round(mix(ROOM_AIR[1], tint[1], t))}, ${Math.round(mix(ROOM_AIR[2], tint[2], t))}, ${(0.3 + 0.55 * t) * fade})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        p.x = nx;
        p.y = ny;
        p.age += 1;
      }
    };

    const loop = () => {
      step();
      raf = onScreen && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => {
      if (!still && !raf && onScreen && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const settle = () => {
      measure();
      // Enough steps to fill the frame with trails before anyone sees it.
      for (let i = 0; i < (still ? 260 : 90); i += 1) step();
      wake();
    };

    settle();
    // Re-measure only when the box really changed (mobile browsers fire resize while scrolling).
    const resize = new ResizeObserver(() => {
      const box = canvas.getBoundingClientRect();
      if (Math.abs(box.width - width) > 1 || Math.abs(box.height - height) > 1) settle();
    });
    resize.observe(canvas);
    // Fonts and layout can move the thermostat after first paint without resizing the canvas.
    const late = window.setTimeout(settle, 600);
    const watch = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      wake();
    });
    watch.observe(canvas);
    document.addEventListener("visibilitychange", wake);

    // With reduced motion there is no loop, so redraw the still frame when the mode changes.
    canvas.redrawStill = still ? settle : null;

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(late);
      resize.disconnect();
      watch.disconnect();
      document.removeEventListener("visibilitychange", wake);
    };
  }, [obstacleRef, resting]);

  useEffect(() => {
    canvasRef.current?.redrawStill?.();
  }, [mode]);

  return <canvas ref={canvasRef} className="airflow" aria-hidden="true" />;
}
