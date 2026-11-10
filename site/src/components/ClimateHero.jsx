import { useEffect, useRef, useState } from "react";
import { FaArrowRightLong, FaPhone } from "react-icons/fa6";
import { Airflow } from "./Airflow.jsx";
import { Thermostat } from "./Thermostat.jsx";
import { HoursLine } from "./Layout.jsx";
import { SEASONS, modeFor, seasonFor, triageFor } from "../lib/season.js";
import { LOCATION, PHONE_DISPLAY, PHONE_LINK } from "../lib/siteFacts.js";

// Degrees the simulated room moves per second toward the set point.
const DEGREES_PER_SECOND = 0.9;
const TICK_MS = 100;

/** The current outdoor reading from this site's own /api/outdoor, or null when it has none. */
function useOutdoor() {
  const [outdoor, setOutdoor] = useState(null);
  useEffect(() => {
    let active = true;
    fetch("/api/outdoor", { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (active && Number.isFinite(body?.tempF)) setOutdoor(body);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return outdoor;
}

const FOLLOW_UP = {
  heating: { text: "Heat not keeping up at your place?", cta: "Get urgent help", href: "/urgent/" },
  cooling: { text: "AC not keeping up at your place?", cta: "Get urgent help", href: "/urgent/" },
  holding: { text: "Steady and comfortable. That’s the job.", cta: "Keep it that way with a tune-up", href: "/book-service/?issue=maintenance" },
};

export function ClimateHero() {
  const season = seasonFor();
  const start = SEASONS[season];
  const [target, setTarget] = useState(start.target);
  const [room, setRoom] = useState(start.room);
  const dialRef = useRef(null);
  const outdoor = useOutdoor();
  const mode = modeFor(room, target);

  // The room drifts toward the set point, the way a real one does after you touch the thermostat.
  useEffect(() => {
    if (mode === "holding") return undefined;
    const id = window.setInterval(() => {
      setRoom((current) => {
        const gap = target - current;
        const move = (DEGREES_PER_SECOND * TICK_MS) / 1000;
        return Math.abs(gap) <= move ? target : current + Math.sign(gap) * move;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [mode, target]);

  const followUp = FOLLOW_UP[mode];

  return (
    <section className={`climate-hero climate-hero--${mode} climate-hero--in-${season}`} id="top" aria-labelledby="hero-title">
      <Airflow mode={mode} resting={start.resting} obstacleRef={dialRef} />
      <div className="climate-hero__shade" aria-hidden="true" />
      <div className="climate-hero__inner">
        <div className="climate-hero__copy">
          <p className="climate-hero__status"><span className="status-dot" /><HoursLine detail={false} /></p>
          <h1 id="hero-title">Your Indoor Weather Experts</h1>
          <p className="climate-hero__lede">Heating, cooling and refrigeration service for homes and businesses around {LOCATION.city}. Tell us what the system is doing and the office takes it from there.</p>
          <div className="climate-hero__actions">
            <a className="button button-primary" href="/book-service/" data-acquisition-event="project_form_opened" data-surface="hero">Book service <FaArrowRightLong aria-hidden="true" /></a>
            <a className="button button-quiet" href={PHONE_LINK} data-surface="hero"><FaPhone aria-hidden="true" /> Call {PHONE_DISPLAY}</a>
          </div>
        </div>

        <div className="climate-hero__dial">
          <Thermostat ref={dialRef} room={room} target={target} mode={mode} onChange={setTarget} />
          <p className="climate-hero__outside">
            {outdoor ? <><strong>{outdoor.tempF}°</strong> outside in {LOCATION.city} right now</> : start.outside}
            <span>Turn the dial. This room is a demonstration, not your thermostat.</span>
          </p>
          <p className="climate-hero__follow" aria-live="polite">
            {followUp.text} <a href={followUp.href} data-acquisition-event="project_form_opened" data-surface={`hero-dial-${mode}`}>{followUp.cta}</a>
          </p>
        </div>

        <nav className="triage-bar" aria-labelledby="triage-title">
          <h2 id="triage-title">What is your system doing?</h2>
          <ul>
            {triageFor(season).map((item) => (
              <li key={item.id}>
                <a className={item.urgent ? "is-urgent" : undefined} href={item.href} data-acquisition-event="project_form_opened" data-surface={`triage-${item.id}`}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {outdoor && <p className="climate-hero__credit">Outdoor temperature: {outdoor.source} hourly forecast for {outdoor.place}.</p>}
    </section>
  );
}

/** One line under the hero that changes with the time of year. */
export function SeasonNote() {
  const note = SEASONS[seasonFor()];
  return (
    <aside className="season-note" aria-label="This season">
      <p>{note.note}</p>
      <a href="/book-service/?issue=maintenance" data-acquisition-event="project_form_opened" data-surface="season-note">{note.noteCta}</a>
    </aside>
  );
}
