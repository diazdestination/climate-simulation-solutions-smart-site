import { useEffect, useRef, useState } from "react";
import { GOOGLE_PROFILE_URL, GOOGLE_WRITE_REVIEW_URL, REVIEWS } from "../content/reviews.js";
import { LICENSE_NUMBER, LOCATION } from "../lib/siteFacts.js";
import { pinProgress, rowIn, sceneAt, wordsOf } from "../lib/reviewScroll.js";

// Customer reviews, told by scrolling. The section pins: the heading gives way to the lead
// review, whose words light up in order as the visitor scrolls, and then the pin lets go and
// the other reviews arrive one by one. Storyboard: the clip Adam sent on 2026-11-13.
//
// Everything is real text. The prerendered HTML is the whole section, fully visible, with the
// lead review as one plain sentence; it stays that way without JavaScript and for visitors who
// ask for reduced motion. Only when the effect can run does the section become tall and pinned
// (`reviews--live`) and the lead review get split into words.
//
// Nothing here handles the wheel or touch. The page scrolls natively and this only reads how
// far it has got, then writes a handful of numbers (CSS variables) for the stylesheet to use.
// How far below its place a review in the list starts, in px. The stylesheet uses the same number.
const ROW_RISE = 28;

export function ReviewsScroll() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const listRef = useRef(null);
  const leadRef = useRef(null);
  const [live, setLive] = useState(false);
  const lead = REVIEWS.find((r) => r.lead);
  const rest = REVIEWS.filter((r) => !r.lead);
  const words = wordsOf(lead.text);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && "IntersectionObserver" in window && window.CSS?.supports?.("opacity", "clamp(0.2, 0.5, 1)")) setLive(true);
  }, []);

  useEffect(() => {
    if (!live) return undefined;
    const section = sectionRef.current;
    const track = trackRef.current;
    const rows = [...listRef.current.children];
    let near = false;
    let target = 0;
    let shown = 0;
    let raf = 0;
    let stopped = false;

    const paint = () => {
      const scene = sceneAt(shown, words.length);
      section.style.setProperty("--title", scene.title.toFixed(3));
      section.style.setProperty("--lead", scene.lead.toFixed(3));
      section.style.setProperty("--lit", scene.lit.toFixed(3));
      section.style.setProperty("--by", scene.by.toFixed(3));
      for (const row of rows) {
        // Measure where the row would sit without its own offset, or it would chase itself.
        const top = row.getBoundingClientRect().top - (Number(row.dataset.shift) || 0);
        const arrived = rowIn(top, window.innerHeight);
        row.dataset.shift = String((1 - arrived) * ROW_RISE);
        row.style.setProperty("--in", arrived.toFixed(3));
      }
    };
    const tick = () => {
      raf = 0;
      const gap = target - shown;
      shown = Math.abs(gap) < 0.002 ? target : shown + gap * 0.25;
      paint();
      if (shown !== target) schedule();
    };
    const schedule = () => {
      if (!raf && !stopped) raf = window.requestAnimationFrame(tick);
    };
    const measure = () => {
      const rect = track.getBoundingClientRect();
      target = pinProgress(rect.top, rect.height, window.innerHeight);
      schedule();
    };
    // The lead review sits in the middle of a full-screen pin, which leaves empty space under
    // it. Tell the stylesheet how much, so the list below starts right after the review
    // instead of a blank half screen later.
    const fit = () => {
      const pin = track.firstElementChild.getBoundingClientRect();
      const tail = Math.max(0, Math.round(pin.bottom - leadRef.current.getBoundingClientRect().bottom));
      section.style.setProperty("--tail", `${tail}px`);
      measure();
    };
    const onScroll = () => {
      if (near) measure();
    };

    // Only read the scroll position while the section is within a screen of the viewport.
    const watcher = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        if (near) measure();
      },
      { rootMargin: "100% 0px" },
    );
    watcher.observe(section);
    fit();
    document.fonts?.ready.then(() => !stopped && fit());
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", fit);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
      watcher.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", fit);
      for (const name of ["--title", "--lead", "--lit", "--by", "--tail"]) section.style.removeProperty(name);
      for (const row of rows) {
        row.style.removeProperty("--in");
        delete row.dataset.shift;
      }
    };
  }, [live, words.length]);

  return (
    <section className={`reviews${live ? " reviews--live" : ""}`} aria-labelledby="reviews-title" ref={sectionRef}>
      <div className="reviews__track" ref={trackRef}>
        <div className="reviews__pin">
          <div className="reviews__title">
            <h2 id="reviews-title">What customers wrote on <span>Google.</span></h2>
            <ul className="reviews__facts">
              {LICENSE_NUMBER && <li>{`License no. ${LICENSE_NUMBER}`}</li>}
              <li>{`Based in ${LOCATION.city}, Georgia`}</li>
            </ul>
          </div>
          <figure className="review review--lead" ref={leadRef}>
            <blockquote>
              {live ? words.map((word, index) => <span key={index} style={{ "--i": index }}>{index < words.length - 1 ? `${word} ` : word}</span>) : lead.text}
            </blockquote>
            <figcaption>{`${lead.author}, ${lead.source} review`}</figcaption>
          </figure>
        </div>
      </div>
      <div className="reviews__list" ref={listRef}>
        {rest.map((r) => (
          <figure className="review" key={r.author}>
            <blockquote>{r.text}</blockquote>
            <figcaption>{`${r.author}, ${r.source} review`}</figcaption>
          </figure>
        ))}
      </div>
      <p className="reviews__more">
        These are excerpts, quoted as written. <a href={GOOGLE_PROFILE_URL} rel="noopener">Read every review on Google</a> or <a href={GOOGLE_WRITE_REVIEW_URL} rel="noopener">write your own</a>.
      </p>
    </section>
  );
}
