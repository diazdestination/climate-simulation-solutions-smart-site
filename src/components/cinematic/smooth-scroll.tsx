"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { getGsap } from "./gsap-setup";
import { useMotionProfile } from "./motion-profile";

/**
 * Lenis smooth scrolling driven by the GSAP ticker so ScrollTrigger stays in sync.
 * Disabled for reduced-motion users, who keep native scrolling.
 */
export function SmoothScroll() {
  const profile = useMotionProfile();

  useEffect(() => {
    if (!profile.ready || profile.reduced) return;
    const { gsap, ScrollTrigger } = getGsap();
    const lenis = new Lenis({ anchors: true, lerp: 0.085, smoothWheel: true });
    const update = () => ScrollTrigger.update();
    lenis.on("scroll", update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.off("scroll", update);
      lenis.destroy();
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, [profile.ready, profile.reduced]);

  return null;
}
