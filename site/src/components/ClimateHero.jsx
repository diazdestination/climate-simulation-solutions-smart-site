import { useEffect, useRef, useState } from "react";
import { FaDroplet, FaFire, FaPhone, FaSnowflake } from "react-icons/fa6";
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

const TILE_ICONS = { warm: FaFire, cool: FaSnowflake, water: FaDroplet };

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
  const triage = triageFor(season);
  const urgent = triage.filter((item) => item.urgent);
  const planned = triage.filter((item) => !item.urgent);

  return (
    <section className={`climate-hero climate-hero--${mode} climate-hero--in-${season}`} id="top" aria-labelledby="hero-title">
      <Airflow mode={mode} resting={start.resting} obstacleRef={dialRef} />
      <div className="climate-hero__shade" aria-hidden="true" />
      <div className="climate-hero__inner">
        <div className="climate-hero__copy">
          <p className="climate-hero__status"><span className="status-dot" /><HoursLine detail={false} /></p>
          <h1 id="hero-title">Your Indoor Weather Experts</h1>
          <p className="climate-hero__lede">Heating, cooling and refrigeration service for homes and businesses around {LOCATION.city}. Tell us what the system is doing and the office takes it from there.</p>
          {/* On a phone these two are the docked bar at the bottom of the screen. */}
          <div className="climate-hero__actions in-mobile-bar">
            <a className="button button-primary" href="/book-service/" data-acquisition-event="project_form_opened" data-surface="hero">Book service</a>
            <a className="button button-quiet" href={PHONE_LINK} data-surface="hero"><FaPhone aria-hidden="true" /> Call {PHONE_DISPLAY}</a>
          </div>
        </div>

        <div className="climate-hero__dial">
          <Thermostat ref={dialRef} room={room} target={target} mode={mode} onChange={setTarget} />
          <p className="climate-hero__outside">
            {outdoor ? <><strong>{outdoor.tempF}°</strong> outside in {LOCATION.city} right now</> : start.outside}
            <span>Tap or turn the dial. This room is a demonstration, not your thermostat.</span>
          </p>
          <p className="climate-hero__follow" aria-live="polite">
            {followUp.text} <a href={followUp.href} data-acquisition-event="project_form_opened" data-surface={`hero-dial-${mode}`}>{followUp.cta}</a>
          </p>
        </div>

        <nav className="triage-bar" aria-labelledby="triage-title">
          <h2 id="triage-title">What is your system doing?</h2>
          <div className="triage-bar__group">
            <p className="triage-bar__label" id="triage-urgent">Needs attention now</p>
            <ul className="triage-tiles" aria-labelledby="triage-urgent">
              {urgent.map((item) => {
                const Icon = TILE_ICONS[item.tone];
                return (
                  <li key={item.id}>
                    <a className={`triage-tile tone-${item.tone}`} href={item.href} data-acquisition-event="project_form_opened" data-surface={`triage-${item.id}`}>
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="triage-bar__group">
            <p className="triage-bar__label" id="triage-planned">Planning ahead</p>
            <ul className="link-rows link-rows--pairs" aria-labelledby="triage-planned">
              {planned.map((item) => (
                <li key={item.id}>
                  <a href={item.href} data-acquisition-event="project_form_opened" data-surface={`triage-${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
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
