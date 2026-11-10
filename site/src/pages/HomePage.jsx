import { HOME_FAQ as FAQ } from "../content/home-faqs.js";
import { FaArrowRightLong, FaCalendarCheck, FaFileInvoiceDollar, FaRobot, FaTriangleExclamation, FaWrench } from "react-icons/fa6";
import { HoursLine, openAssistant } from "../components/Layout.jsx";
import { AVAILABILITY_CHECK_COMMUNITIES, SERVICE_PAGES, servicePath } from "../content/pages.js";
import { PHONE_DISPLAY, PHONE_LINK } from "../lib/siteFacts.js";

const PATHS = [
  { href: "/urgent/", icon: FaTriangleExclamation, warm: true, title: "No heat, no AC or a water leak", body: "Safety steps first, then the fastest way to reach the office.", cta: "Get urgent help" },
  { href: "/book-service/", icon: FaWrench, title: "Book a service call", body: "Tell us what the system is doing and when works for you. The office confirms the time.", cta: "Request service" },
  { href: "/maintenance-plans/", icon: FaCalendarCheck, title: "Maintenance plans", body: "Residential visits every six months, commercial visits quarterly, billed annually.", cta: "See plans" },
  { href: "/estimate-follow-up/", icon: FaFileInvoiceDollar, warm: true, title: "Questions about an estimate", body: "Received an estimate and want to talk it through? Send the office your question.", cta: "Ask about my estimate" },
];


export function HomePage() {
  return (
    <>
      <section className="hero" id="top">
        <img className="hero-image" src="/assets/climate-precision-hero.webp" width="1935" height="812" alt="Outdoor HVAC system beside a North Georgia home at dusk (illustrative image)" fetchpriority="high" />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="eyebrow"><span className="status-dot" /><HoursLine /></div>
          <h1>Your Indoor <em>Weather Experts</em></h1>
          <p className="hero-lede">Heating, cooling and refrigeration help for North Georgia homes and businesses — from urgent repairs to long-term system care.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/book-service/" data-acquisition-event="project_form_opened" data-surface="hero">Book service <FaArrowRightLong aria-hidden="true" /></a>
            <a className="button button-quiet" href={PHONE_LINK} data-surface="hero">Call {PHONE_DISPLAY}</a>
            <a className="button button-urgent" href="/urgent/" data-acquisition-event="project_form_opened" data-surface="hero-urgent">No heat / No AC / Leak</a>
          </div>
        </div>
        <div className="hero-trust" aria-label="Service highlights">
          <span>Residential</span><i /><span>Commercial</span><i /><span>Emergency hours</span>
        </div>
      </section>

      <section className="paths" aria-labelledby="paths-title">
        <div className="section-intro">
          <p className="kicker">Start here</p>
          <h2 id="paths-title">What does your space need?</h2>
          <p>Choose the closest match. Every path ends with a real person at the office confirming the next step.</p>
        </div>
        <div className="path-grid">
          {PATHS.map(({ href, icon: Icon, warm, title, body, cta }) => (
            <a key={href} className={`path-card${warm ? " path-card--warm" : ""}`} href={href}>
              <span className="path-icon" aria-hidden="true"><Icon /></span>
              <strong>{title}</strong>
              <span>{body}</span>
              <em>{cta} <FaArrowRightLong aria-hidden="true" /></em>
            </a>
          ))}
        </div>
      </section>

      <section className="services" id="services" aria-labelledby="services-title">
        <div className="services-heading">
          <div>
            <p className="kicker">What we handle</p>
            <h2 id="services-title">One team for the system behind your space.</h2>
          </div>
          <p>Repair what’s wrong today. Plan what comes next. Keep the equipment you depend on working the way it should.</p>
        </div>
        <div className="services-list">
          {SERVICE_PAGES.map((page, index) => (
            <article className="service-row" key={page.slug}>
              <span className="service-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{page.eyebrow}</h3>
              <p>{page.lede}</p>
              <a href={servicePath(page.slug)}>Learn more <FaArrowRightLong aria-hidden="true" /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="decision-section" aria-labelledby="decision-title">
        <div className="decision-visual">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <img className="brand-emblem" src="/assets/css-logo-transparent.png" width="1254" height="1254" loading="lazy" alt="Climate Simulation Solutions logo: sun, snowflake, mountains and warm and cool airflow above CSS" />
          <span className="orbit-label label-repair" aria-hidden="true">Repair</span>
          <span className="orbit-label label-install" aria-hidden="true">Install</span>
          <span className="orbit-label label-maintain" aria-hidden="true">Maintain</span>
        </div>
        <div className="decision-copy">
          <p className="kicker">How a request works</p>
          <h2 id="decision-title">Good service starts before anyone turns a wrench.</h2>
          <ul className="value-list">
            <li><span>01</span><div><strong>Tell us the situation</strong><p>What the system is doing, the service address, and the equipment if you know it.</p></div></li>
            <li><span>02</span><div><strong>The office reviews it</strong><p>Availability depends on the address, equipment, timing and type of work.</p></div></li>
            <li><span>03</span><div><strong>We confirm the next step with you</strong><p>The office calls or emails to confirm an appointment. Nothing online is a confirmed booking.</p></div></li>
          </ul>
        </div>
      </section>

      <section className="assistant-teaser" aria-labelledby="assistant-title">
        <FaRobot aria-hidden="true" />
        <div>
          <p className="kicker">AI website assistant · preview</p>
          <h2 id="assistant-title">Not sure what to ask for?</h2>
          <p>An AI assistant can help you describe what’s happening and point you to the right request. It can’t diagnose, quote prices or book — and you’ll see how it handles your information before it starts.</p>
        </div>
        <button className="button button-quiet" type="button" onClick={openAssistant} data-acquisition-event="voice_assistant_opened" data-surface="home">Open the assistant</button>
      </section>

      <section className="coverage" id="coverage" aria-labelledby="coverage-title">
        <div className="coverage-map" aria-hidden="true">
          <span className="map-ring map-ring-1" /><span className="map-ring map-ring-2" /><span className="map-ring map-ring-3" />
          <span className="map-origin"><i />Dawsonville</span>
        </div>
        <div className="coverage-copy">
          <p className="kicker">North Georgia service area</p>
          <h2 id="coverage-title">Based in Dawsonville. Building a wider reach.</h2>
          <p>Climate Simulation Solutions serves Dawsonville and surrounding communities. Call with your service address so the team can confirm availability for your location and type of work.</p>
          <div className="city-check">
            <span>Call to check availability</span>
            <div className="city-chips">{AVAILABILITY_CHECK_COMMUNITIES.slice(0, 8).map((c) => <span key={c}>{c}</span>)}</div>
          </div>
          <a className="button button-primary coverage-button" href="/service-areas/">Service area details <FaArrowRightLong aria-hidden="true" /></a>
        </div>
      </section>

      <section className="answers" aria-labelledby="answers-title">
        <div className="answers-heading">
          <p className="kicker">Before you call</p>
          <h2 id="answers-title">Straight answers to common questions.</h2>
        </div>
        <div className="faq-list">
          {FAQ.map(([q, a], i) => (
            <details key={q} open={i === 0}>
              <summary>{q}<span aria-hidden="true">+</span></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <ClosingCta />
    </>
  );
}

export function ClosingCta() {
  return (
    <section className="closing-cta" aria-labelledby="closing-title">
      <img className="closing-logo" src="/assets/css-logo-transparent.png" width="1254" height="1254" loading="lazy" alt="Climate Simulation Solutions" />
      <p className="kicker">Your next step</p>
      <h2 id="closing-title">Let’s get your space back to comfortable.</h2>
      <p>Have the service address, a callback number and a short description of the issue ready.</p>
      <div className="closing-actions">
        <a className="button button-primary" href="/book-service/">Book service <FaArrowRightLong aria-hidden="true" /></a>
        <a className="button button-quiet" href={PHONE_LINK} data-surface="closing">Call {PHONE_DISPLAY}</a>
      </div>
    </section>
  );
}
