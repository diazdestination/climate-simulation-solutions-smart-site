import { HOME_FAQ as FAQ } from "../content/home-faqs.js";
import { ClimateHero, SeasonNote } from "../components/ClimateHero.jsx";
import { AreaMap } from "../components/AreaMap.jsx";
import { ReviewsScroll } from "../components/ReviewsScroll.jsx";
import { SystemAssembly } from "../components/SystemAssembly.jsx";
import { HoursLine, openAssistant } from "../components/Layout.jsx";
import { MAP_TOWNS } from "../content/area-map.js";
import { SERVICE_PAGES, areaPath, servicePath } from "../content/pages.js";
import { PHONE_DISPLAY, PHONE_LINK } from "../lib/siteFacts.js";

export function HomePage() {
  return (
    <>
      <ClimateHero />
      <SeasonNote />
      <ReviewsScroll />

      <section className="work" id="services" aria-labelledby="services-title">
        <div className="work__head">
          <h2 id="services-title">One team for the system behind your space.</h2>
          <p>Repair what’s wrong today. Plan what comes next. Keep the equipment you depend on working the way it should.</p>
        </div>
        <ul className="work__index">
          {SERVICE_PAGES.map((page) => (
            <li key={page.slug}>
              <a href={servicePath(page.slug)}>
                <h3>{page.eyebrow}</h3>
                <p>{page.lede}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <SystemAssembly />

      <section className="request-steps" aria-labelledby="steps-title">
        <h2 id="steps-title">Good service starts before anyone turns a wrench.</h2>
        <ol className="request-steps__track">
          <li><span aria-hidden="true">1</span><h3>Tell us the situation</h3><p>What the system is doing, the service address, and the equipment if you know it.</p></li>
          <li><span aria-hidden="true">2</span><h3>The office reviews it</h3><p>Availability depends on the address, equipment, timing and type of work.</p></li>
          <li><span aria-hidden="true">3</span><h3>We confirm the next step with you</h3><p>The office calls or emails to confirm an appointment. Nothing online is a confirmed booking.</p></li>
        </ol>
        <div className="request-steps__assistant" aria-labelledby="assistant-title">
          <div>
            <h3 id="assistant-title">Not sure what to ask for?</h3>
            <p>An AI website assistant (preview) can help you describe what’s happening and point you to the right request. It can’t diagnose, quote prices or book — and you’ll see how it handles your information before it starts.</p>
          </div>
          <button className="button button-quiet" type="button" onClick={openAssistant} data-acquisition-event="voice_assistant_opened" data-surface="home">Open the assistant</button>
        </div>
      </section>

      <section className="area" id="coverage" aria-labelledby="coverage-title">
        <AreaMap />
        <div className="area__copy">
          <h2 id="coverage-title">Based in Dawsonville. Serving North Georgia and metro Atlanta.</h2>
          <p>Climate Simulation Solutions serves homes and businesses in Dawsonville and the communities around it.</p>
          <ul className="area__towns">
            {MAP_TOWNS.map((t) => <li key={t.slug}><a href={areaPath(t.slug)}>{t.name}</a></li>)}
          </ul>
          <div className="area__actions">
            <a className="button button-primary in-mobile-bar" href={PHONE_LINK} data-surface="coverage">Call {PHONE_DISPLAY}</a>
            <a className="button button-quiet" href="/service-areas/">All service areas</a>
          </div>
        </div>
      </section>

      <section className="answers" aria-labelledby="answers-title">
        <div className="answers-heading">
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

/** The last thing on every page: the phone number, set as large as it will go. */
export function ClosingCta() {
  return (
    <section className="closing" aria-labelledby="closing-title">
      <h2 id="closing-title">Let’s get your space back to comfortable.</h2>
      <a className="closing__phone" href={PHONE_LINK} data-surface="closing" aria-label={`Call ${PHONE_DISPLAY}`}>{PHONE_DISPLAY}</a>
      <div className="closing__row">
        <p><HoursLine detail={false} />. Have the service address, a callback number and a short description of the issue ready.</p>
        <a className="button button-primary in-mobile-bar" href="/book-service/">Book service</a>
      </div>
    </section>
  );
}
