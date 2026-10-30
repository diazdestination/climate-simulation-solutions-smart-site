"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cinematic } from "@/lib/cinematic-state";
import { getGsap } from "./gsap-setup";
import { HeroFallback } from "./hero-fallback";
import { useMotionProfile } from "./motion-profile";
import { SceneLoader } from "./scene-loader";

export type Chapter = {
  number: string;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  primary?: boolean;
};

type Props = {
  hero: React.ReactNode;
  chapters: Chapter[];
};

/** Where each chapter sits on the 0..1 scroll timeline. */
const CHAPTER_START = [0.27, 0.53, 0.79];
const CHAPTER_IN = 0.07;
const CHAPTER_HOLD = 0.12;

/**
 * Sticky cinematic stage. The hero and chapters scroll over a fixed WebGL scene
 * whose state is scrubbed by scroll. Without JS, or with reduced motion, the same
 * content renders as ordinary stacked sections over a static visual.
 */
export function CinematicStage({ hero, chapters }: Props) {
  const profile = useMotionProfile();
  const wrapRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(true);

  const cinematicMode = profile.ready && !profile.reduced;
  const webgl = cinematicMode && profile.webgl;

  // Pause the render loop while the stage is off screen.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !webgl) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: "80px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [webgl]);

  // Pointer parallax.
  useEffect(() => {
    if (!cinematicMode) return;
    const onMove = (e: PointerEvent) => {
      cinematic.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      cinematic.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [cinematicMode]);

  // Entrance animation and scroll choreography.
  useEffect(() => {
    const wrap = wrapRef.current;
    const heroEl = heroRef.current;
    if (!cinematicMode || !wrap || !heroEl) {
      document.documentElement.classList.remove("motion");
      return;
    }
    const { gsap, ScrollTrigger } = getGsap();
    const chapterEls = gsap.utils.toArray<HTMLElement>(".cine-chapter", wrap);
    const railItems = railRef.current ? Array.from(railRef.current.children) : [];

    const ctx = gsap.context(() => {
      // Intro: set hidden states inline, then release the pre-paint CSS hide.
      const lines = gsap.utils.toArray<HTMLElement>(".hero-line > span", heroEl);
      const intro = gsap.utils.toArray<HTMLElement>(".cine-intro", heroEl);
      const entrance = gsap.timeline({ defaults: { ease: "power4.out" } });
      entrance
        .fromTo(lines, { yPercent: 112 }, { yPercent: 0, duration: 1.4, stagger: 0.11 }, 0.15)
        .fromTo(
          intro,
          { autoAlpha: 0, y: 34 },
          { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12 },
          0.35,
        );
      if (hintRef.current) {
        entrance.fromTo(hintRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 1.2);
      }
      gsap.set(chapterEls, { autoAlpha: 0 });
      document.documentElement.classList.remove("motion");

      // Scroll-scrubbed story timeline, 0..1 across the stage height.
      const story = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: wrap,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.65,
          onUpdate: (self) => {
            cinematic.progress = self.progress;
            const p = self.progress;
            let index = 0;
            CHAPTER_START.forEach((s, i) => {
              if (p >= s - 0.02) index = i + 1;
            });
            railItems.forEach((item, i) => item.classList.toggle("is-active", i === index));
          },
        },
      });
      story.to(heroEl, { autoAlpha: 0, y: -70, duration: 0.2 }, 0.02);
      if (hintRef.current) story.to(hintRef.current, { autoAlpha: 0, duration: 0.08 }, 0);
      chapterEls.forEach((el, i) => {
        const start = CHAPTER_START[i] ?? 0.8;
        story.fromTo(
          el,
          { autoAlpha: 0, y: 70 },
          { autoAlpha: 1, y: 0, duration: CHAPTER_IN },
          start,
        );
        if (i < chapterEls.length - 1) {
          story.to(
            el,
            { autoAlpha: 0, y: -60, duration: CHAPTER_IN },
            start + CHAPTER_IN + CHAPTER_HOLD,
          );
        }
      });
      story.set({}, {}, 1);
    }, wrap);

    const refresh = () => ScrollTrigger.refresh();
    const timer = window.setTimeout(refresh, 300);
    window.addEventListener("load", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", refresh);
      cinematic.progress = 0;
      ctx.revert();
    };
  }, [cinematicMode]);

  return (
    <section
      ref={wrapRef}
      className={`cine-wrap${cinematicMode ? " is-cinematic" : ""}`}
      aria-label="Introduction"
    >
      <div className="cine-stage">
        <div className="cine-backdrop">
          {webgl ? <SceneLoader lowPower={profile.lowPower} active={active} /> : <HeroFallback />}
        </div>
        <div className="cine-scrim" aria-hidden="true" />
        <div ref={heroRef} className="container cine-hero">
          {hero}
        </div>
        {chapters.map((chapter, i) => (
          <div className="container cine-chapter" key={chapter.number}>
            <div className="cine-chapter-inner">
              <p className="eyebrow cine-eyebrow">
                <span className="signal-dot" /> {chapter.number} / {chapter.eyebrow}
              </p>
              <h2 className="cine-title">{chapter.title}</h2>
              <p className="cine-body">{chapter.body}</p>
              {chapter.primary ? (
                <Link className="button button-primary button-large" href={chapter.href}>
                  {chapter.linkLabel} <span aria-hidden="true">↗</span>
                </Link>
              ) : (
                <Link className="text-link" href={chapter.href}>
                  {chapter.linkLabel} <span aria-hidden="true">↗</span>
                </Link>
              )}
              <span className="cine-index" aria-hidden="true">
                {String(i + 2).padStart(2, "0")}
              </span>
            </div>
          </div>
        ))}
        <ol ref={railRef} className="cine-rail" aria-hidden="true">
          <li className="is-active">Start</li>
          {chapters.map((c) => (
            <li key={c.number}>{c.eyebrow}</li>
          ))}
        </ol>
        <div ref={hintRef} className="cine-hint" aria-hidden="true">
          <span className="cine-hint-line" />
          Scroll to explore
        </div>
      </div>
    </section>
  );
}
