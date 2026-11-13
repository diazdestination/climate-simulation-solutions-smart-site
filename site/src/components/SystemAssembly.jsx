import { useEffect, useRef, useState } from "react";
import { ASSEMBLY, ASSEMBLY_ALT, ASSEMBLY_NOTE, ASSEMBLY_STAGES, LEAD, frameUrl, loadOrder, nearestLoaded, progressFor, stageAt } from "../content/system-assembly.js";

// A heating and cooling unit that comes together as the visitor scrolls: the section pins to the
// screen and the scroll position picks which frame of the clip is drawn.
//
// The page is complete without any of this. The prerendered HTML is a still picture beside three
// captions, and it stays that way for visitors who ask for reduced motion or data saving, or
// whose browser cannot run it. Only when the effect can run does the section become tall and
// pinned (`assembly--live`).
//
// It must never get in the way of scrolling. There is no wheel or touch handling here: the page
// scrolls natively and this only reads where it has got to. Frames are not requested until the
// section is within a screen and a half, so the top of the page loads exactly as fast as before.
const PARALLEL = 6;
const MAX_DPR = 2;

export function SystemAssembly() {
  const trackRef = useRef(null);
  const canvasRef = useRef(null);
  const [live, setLive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = navigator.connection?.saveData === true;
    const canDraw = Boolean(canvasRef.current?.getContext("2d")) && "IntersectionObserver" in window;
    if (!reduce && !saveData && canDraw) setLive(true);
  }, []);

  useEffect(() => {
    if (!live) return undefined;
    const track = trackRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const slow = /(^|-)(2g|3g)$/.test(navigator.connection?.effectiveType ?? "");
    const set = slow || window.matchMedia("(max-width: 560px)").matches ? "phone" : "full";
    // One column (captions stacked under the picture) at the same width the stylesheet uses.
    const stacked = window.matchMedia("(max-width: 980px)");
    const count = ASSEMBLY.frames;
    const images = new Array(count).fill(null);
    const queue = loadOrder(count);
    let inFlight = 0;
    let started = false;
    let near = false;
    let target = 0;
    let shown = 0;
    let drawn = -1;
    let raf = 0;
    let stopped = false;
    let currentStage = 0;

    const draw = () => {
      const index = nearestLoaded(images, Math.round(shown * (count - 1)));
      if (index < 0 || (index === drawn && canvas.dataset.sized === "yes")) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(images[index], 0, 0, canvas.width, canvas.height);
      canvas.dataset.sized = "yes";
      if (drawn < 0) setPlaying(true);
      drawn = index;
    };

    const tick = () => {
      raf = 0;
      const gap = target - shown;
      shown = Math.abs(gap) < 0.002 ? target : shown + gap * 0.22;
      const next = stageAt(shown, stacked.matches);
      if (next !== currentStage) {
        currentStage = next;
        setStage(next);
      }
      draw();
      if (shown !== target) schedule();
    };
    const schedule = () => {
      if (!raf && !stopped) raf = window.requestAnimationFrame(tick);
    };

    const pump = () => {
      while (!stopped && inFlight < PARALLEL && queue.length) {
        const index = queue.shift();
        const image = new Image();
        image.decoding = "async";
        inFlight += 1;
        const done = (ok) => {
          inFlight -= 1;
          if (ok) images[index] = image;
          if (!stopped) {
            if (ok) schedule();
            pump();
          }
        };
        image.onload = () => done(true);
        image.onerror = () => done(false);
        image.src = frameUrl(set, index);
      }
    };

    const measure = () => {
      const rect = track.getBoundingClientRect();
      target = progressFor(rect.top, rect.height, window.innerHeight, stacked.matches ? LEAD.stacked : LEAD.wide);
      schedule();
    };
    const onScroll = () => {
      if (near) measure();
    };

    const size = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = Math.max(1, Math.round(box.width * dpr));
      const height = Math.max(1, Math.round(box.height * dpr));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingQuality = "high";
      canvas.dataset.sized = "no";
      measure();
    };

    // Start fetching a screen and a half before the section arrives, and only read the scroll
    // position while it is that close.
    const watcher = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        if (near && !started) {
          started = true;
          pump();
        }
        if (near) measure();
      },
      { rootMargin: "150% 0px" },
    );
    watcher.observe(track);
    const resizer = "ResizeObserver" in window ? new ResizeObserver(size) : null;
    resizer?.observe(canvas);
    size();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", size);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
      watcher.disconnect();
      resizer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", size);
    };
  }, [live]);

  const state = `${live ? " assembly--live" : ""}${playing ? " assembly--playing" : ""}`;
  return (
    <section className={`assembly${state}`} aria-labelledby="assembly-title">
      <h2 id="assembly-title">A lot has to work together before the air feels right.</h2>
      <div className="assembly__track" ref={trackRef}>
        <div className="assembly__pin">
          <ol className="assembly__stages">
            {ASSEMBLY_STAGES.map((item, index) => (
              <li key={item.title} className={live && index === stage ? "is-current" : undefined}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                {item.link && <a href={item.link.href}>{item.link.label}</a>}
              </li>
            ))}
          </ol>
          <figure className="assembly__stage">
            <div className="assembly__frame">
              <img src={ASSEMBLY.poster} width={ASSEMBLY.sets.full.width} height={ASSEMBLY.sets.full.height} alt={ASSEMBLY_ALT} loading="lazy" decoding="async" />
              <canvas ref={canvasRef} aria-hidden="true" />
            </div>
            <figcaption>{ASSEMBLY_NOTE}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
