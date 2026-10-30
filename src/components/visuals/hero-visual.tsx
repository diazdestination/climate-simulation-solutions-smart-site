"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useMotionProfile } from "@/components/motion/motion-profile";
import { airflowInput } from "./airflow-scene";
import { SunIcon, SnowflakeIcon } from "./brand-icons";

const AirflowScene = dynamic(() => import("./airflow-scene"), {
  ssr: false,
  loading: () => <HeroFallbackArt />,
});

/** Original CSS orb, kept as the server-rendered and reduced-motion visual. */
export function HeroFallbackArt() {
  return (
    <>
      <div className="visual-ring ring-one" />
      <div className="visual-ring ring-two" />
      <div className="visual-core">
        <div className="core-shine" />
      </div>
    </>
  );
}

/** World-space half extents of the camera frustum at z = 0 for the scene camera. */
const HALF_HEIGHT = Math.tan((38 / 2) * (Math.PI / 180)) * 7.2;

export function HeroVisual() {
  const profile = useMotionProfile();
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const webgl = profile.ready && !profile.reduced && profile.webgl;

  useEffect(() => {
    const el = box.current;
    if (!el || !webgl) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      rootMargin: "60px",
    });
    io.observe(el);
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
      const aspect = r.width / Math.max(r.height, 1);
      airflowInput.x = nx * HALF_HEIGHT * aspect;
      airflowInput.y = ny * HALF_HEIGHT;
    };
    const onEnter = () => (airflowInput.hover = 1);
    const onLeave = () => {
      airflowInput.hover = 0;
      airflowInput.x = -10;
      airflowInput.y = -10;
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [webgl]);

  return (
    <div ref={box} className={`hero-visual${webgl ? " is-live" : ""}`} aria-hidden="true">
      {webgl ? <AirflowScene lowPower={profile.lowPower} active={active} /> : <HeroFallbackArt />}
      <div className="flow-label flow-label-warm">
        <SunIcon />
        <span>
          WARM AIR IN
          <small>HEAT · HUMIDITY</small>
        </span>
      </div>
      <div className="flow-label flow-label-cool">
        <span>
          COOL AIR OUT
          <small>EVEN · QUIET</small>
        </span>
        <SnowflakeIcon />
      </div>
      <div className="visual-caption">
        <span className="caption-line" /> COMFORT IN MOTION <span>•</span> NORTH GEORGIA
      </div>
      <div className="visual-coordinate">34° NORTH / BUILT FOR HERE</div>
    </div>
  );
}
