"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getGsap } from "./gsap-setup";
import { useMotionProfile } from "./motion-profile";

/**
 * Animates any element marked `data-reveal` into view once as it enters the viewport.
 * Children of `data-reveal-group` stagger. Elements stay fully visible without JS
 * or when the user prefers reduced motion.
 */
export function ScrollReveals() {
  const profile = useMotionProfile();
  const pathname = usePathname();

  useEffect(() => {
    if (!profile.ready || profile.reduced) return;
    const { gsap, ScrollTrigger } = getGsap();
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          autoAlpha: 0,
          y: 44,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
        const items = Array.from(group.children);
        if (items.length === 0) return;
        gsap.from(items, {
          autoAlpha: 0,
          y: 36,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.09,
          scrollTrigger: { trigger: group, start: "top 85%", once: true },
        });
      });
      gsap.utils.toArray<SVGPathElement>("[data-draw]").forEach((path) => {
        gsap.fromTo(
          path,
          { strokeDasharray: 1, strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            duration: 1.6,
            ease: "power2.inOut",
            scrollTrigger: { trigger: path, start: "top 85%", once: true },
          },
        );
      });
    });
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const timer = window.setTimeout(refresh, 400);
    return () => {
      window.removeEventListener("load", refresh);
      window.clearTimeout(timer);
      ctx.revert();
    };
  }, [profile.ready, profile.reduced, pathname]);

  return null;
}
