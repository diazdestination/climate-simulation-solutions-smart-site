import { forwardRef, useRef } from "react";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { TARGET_MAX, TARGET_MIN, clampTarget, isTap, startsTurn } from "../lib/season.js";

// A round thermostat: a 270-degree scale from 60 to 80 with the gap at the bottom. The handle is
// the set point; the filled arc is the distance the system still has to move the room.
const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 132;
const START = 135; // degrees, measured clockwise from the positive x axis
const SWEEP = 270;

const angleFor = (value) => START + ((value - TARGET_MIN) / (TARGET_MAX - TARGET_MIN)) * SWEEP;
const point = (angle, radius = RADIUS) => {
  const rad = (angle * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
};
const arc = (from, to) => {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const [x1, y1] = point(angleFor(a));
  const [x2, y2] = point(angleFor(b));
  const large = angleFor(b) - angleFor(a) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

const TICKS = Array.from({ length: TARGET_MAX - TARGET_MIN + 1 }, (_, i) => TARGET_MIN + i);
const MODE_LABEL = { heating: "Heating to", cooling: "Cooling to", holding: "Holding at" };

export const Thermostat = forwardRef(function Thermostat({ room, target, mode, onChange }, ref) {
  // The gesture in progress: null, or { id, x, y, turning } for the pointer that is down.
  const gesture = useRef(null);

  const valueAt = (event) => {
    const box = event.currentTarget.ownerSVGElement.getBoundingClientRect();
    const x = event.clientX - (box.left + box.width / 2);
    const y = event.clientY - (box.top + box.height / 2);
    let angle = (Math.atan2(y, x) * 180) / Math.PI;
    if (angle < START - 45) angle += 360; // keep the scale continuous across the 0/360 seam
    const clamped = Math.min(START + SWEEP, Math.max(START, angle));
    return clampTarget(TARGET_MIN + ((clamped - START) / SWEEP) * (TARGET_MAX - TARGET_MIN));
  };

  // Mouse and pen: press anywhere on the ring and drag, as before.
  // Touch: the ring sits in the middle of a phone screen, right where a thumb lands to scroll.
  // So a touch does nothing when it lands. It turns the dial only after it has clearly moved
  // sideways, and sets the temperature on a tap. A vertical swipe scrolls the page: the browser
  // takes it (touch-action: pan-y in home.css) and sends pointercancel.
  const onPointerDown = (event) => {
    const touch = event.pointerType === "touch";
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, turning: !touch };
    if (touch) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onChange(valueAt(event));
  };
  const onPointerMove = (event) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    if (!g.turning && startsTurn(event.clientX - g.x, event.clientY - g.y)) {
      g.turning = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (g.turning) onChange(valueAt(event));
  };
  const onPointerUp = (event) => {
    const g = gesture.current;
    gesture.current = null;
    if (g && g.id === event.pointerId && !g.turning && isTap(event.clientX - g.x, event.clientY - g.y)) onChange(valueAt(event));
  };
  const onPointerCancel = () => {
    gesture.current = null;
  };
  const onKeyDown = (event) => {
    const steps = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 };
    if (event.key in steps) onChange(clampTarget(target + steps[event.key]));
    else if (event.key === "Home") onChange(TARGET_MIN);
    else if (event.key === "End") onChange(TARGET_MAX);
    else return;
    event.preventDefault();
  };

  const [hx, hy] = point(angleFor(target));
  const shown = Math.round(room);

  return (
    <div className={`thermostat thermostat--${mode}`} ref={ref}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="thermostat-dial">
        <circle className="thermostat-face" cx={CENTER} cy={CENTER} r={RADIUS + 22} />
        <g className="thermostat-ticks" aria-hidden="true">
          {TICKS.map((value) => {
            const major = value % 5 === 0;
            const [x1, y1] = point(angleFor(value), RADIUS - (major ? 24 : 18));
            const [x2, y2] = point(angleFor(value), RADIUS - 12);
            const [tx, ty] = point(angleFor(value), RADIUS - 40);
            return (
              <g key={value}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} className={major ? "is-major" : undefined} />
                {major && <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central">{value}</text>}
              </g>
            );
          })}
        </g>
        <path className="thermostat-track" d={arc(TARGET_MIN, TARGET_MAX)} />
        {mode !== "holding" && <path className="thermostat-gap" d={arc(Math.min(TARGET_MAX, Math.max(TARGET_MIN, room)), target)} />}
        <path
          className="thermostat-hit"
          d={arc(TARGET_MIN, TARGET_MAX)}
          role="slider"
          tabIndex={0}
          aria-label="Set the temperature"
          aria-valuemin={TARGET_MIN}
          aria-valuemax={TARGET_MAX}
          aria-valuenow={target}
          aria-valuetext={`${target} degrees. ${MODE_LABEL[mode]} ${target}. The room is ${shown}.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onKeyDown={onKeyDown}
        />
        <circle className="thermostat-handle" cx={hx} cy={hy} r="13" aria-hidden="true" />
      </svg>
      <div className="thermostat-readout" aria-hidden="true">
        <span className="thermostat-room">{shown}<sup>°</sup></span>
        <span className="thermostat-mode">{MODE_LABEL[mode]} {target}°</span>
      </div>
      <div className="thermostat-steps">
        <button type="button" onClick={() => onChange(clampTarget(target - 1))} disabled={target <= TARGET_MIN} aria-label="Lower the set temperature one degree"><FaMinus aria-hidden="true" /></button>
        <button type="button" onClick={() => onChange(clampTarget(target + 1))} disabled={target >= TARGET_MAX} aria-label="Raise the set temperature one degree"><FaPlus aria-hidden="true" /></button>
      </div>
    </div>
  );
});
