import { HOME_FAQ as FAQ } from "../content/home-faqs.js";
import { FaArrowRightLong, FaRobot } from "react-icons/fa6";
import { ClimateHero, SeasonNote } from "../components/ClimateHero.jsx";
import { openAssistant } from "../components/Layout.jsx";
import { AVAILABILITY_CHECK_COMMUNITIES, SERVICE_PAGES, servicePath } from "../content/pages.js";
import { GOOGLE_PROFILE_URL, GOOGLE_WRITE_REVIEW_URL, REVIEWS } from "../content/reviews.js";
import { LICENSE_NUMBER, LOCATION, PHONE_DISPLAY, PHONE_LINK } from "../lib/siteFacts.js";

function Reviews() {
  const lead = REVIEWS.find((r) => r.lead);
  const rest = REVIEWS.filter((r) => !r.lead);
  return (
    <section className="reviews" aria-labelledby="reviews-title">
      <div className="reviews__head">
        <h2 id="reviews-title">What customers wrote on Google.</h2>
        <ul className="reviews__facts">
          {LICENSE_NUMBER && <li>{`License no. ${LICENSE_NUMBER}`}</li>}
          <li>Insured</li>
          <li>{`Locally owned in ${LOCATION.city}`}</li>
        </ul>
      </div>
      <figure className="review review--lead">
        <blockquote>{lead.text}</blockquote>
        <figcaption>{`${lead.author}, ${lead.source} review`}</figcaption>
      </figure>
      <div className="reviews__list">
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

export function HomePage() {
  return (
    <>
      <ClimateHero />
      <SeasonNote />
      <Reviews />

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
