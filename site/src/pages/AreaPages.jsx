// Service-area pages: the index at /service-areas/ and one page per community served.
// Town data and page copy come from content/area-map.js and content/pages.js.
import { AreaMap } from "../components/AreaMap.jsx";
import { HOME_BASE, MAP_TOWNS, milesFromBase, nearestTowns } from "../content/area-map.js";
import { AREA_PAGES, SERVICE_PAGES, areaPath, servicePath } from "../content/pages.js";
import { HOURS_CONFIRMED, HOURS_TEXT, PHONE_DISPLAY, PHONE_LINK } from "../lib/siteFacts.js";
import { ClosingCta } from "./HomePage.jsx";

const byDistance = [...MAP_TOWNS].sort((a, b) => milesFromBase(a) - milesFromBase(b));

export function AreaPage({ page }) {
  const { town, isBase } = page;
  const nearby = isBase ? byDistance.slice(0, 3) : nearestTowns(town);
  return (
    <div className="page area-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span>/</span><a href="/service-areas/">Service area</a><span>/</span><span>{town.name}</span>
      </nav>

      <section className="area-hero">
        <div className="area-hero__copy">
          <p className="kicker">{page.eyebrow}</p>
          <h1>{page.headline}</h1>
          <p className="area-hero__lede">{page.lede}</p>
          <div className={`hero-actions${page.primaryAction.href === "/book-service/" ? " in-mobile-bar" : ""}`}>
            <a className="button button-primary" href={page.primaryAction.href} data-acquisition-event="project_form_opened" data-surface={`area-${town.slug}`}>{page.primaryAction.label}</a>
            <a className="button button-quiet in-mobile-bar" href={PHONE_LINK} data-surface={`area-${town.slug}`}>Call {PHONE_DISPLAY}</a>
          </div>
          <dl className="area-facts">
            <dt>County</dt><dd>{town.county}</dd>
            <dt>From our base</dt><dd>{isBase ? "This is our base" : `About ${Math.round(milesFromBase(town))} miles, in a straight line`}</dd>
            {HOURS_CONFIRMED && <><dt>Office hours</dt><dd>{HOURS_TEXT}</dd></>}
          </dl>
        </div>
        <AreaMap highlight={isBase ? undefined : town.slug} />
      </section>

      <section className="work" aria-labelledby="area-services-title">
        <div className="work__head">
          <h2 id="area-services-title">{`What we do in ${town.name}.`}</h2>
          <p>{town.place}</p>
        </div>
        <ul className="work__index">
          {SERVICE_PAGES.map((service) => (
            <li key={service.slug}>
              <a href={servicePath(service.slug)}>
                <h3>{service.eyebrow}</h3>
                <p>{service.lede}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="area-request" aria-labelledby="area-request-title">
        <h2 id="area-request-title">{`Requesting service in ${town.name}.`}</h2>
        <div className="area-request__columns">
          <div>
            <h3>For a service call or an estimate</h3>
            <p>{`Book online or call. Give the service address in ${town.name} and tell us what the system is doing. An online request is not a confirmed appointment: the office calls or emails to confirm a time.`}</p>
            <a href="/book-service/" data-acquisition-event="project_form_opened" data-surface={`area-${town.slug}-request`}>Book a service call</a>
          </div>
          <div>
            <h3>When it can’t wait</h3>
            <p>No heat, no AC, or water leaking from the system? Call first. Outside normal office hours, urgent calls are handled as emergency-hours requests, and response depends on availability and location.</p>
            <a href="/urgent/" data-acquisition-event="project_form_opened" data-surface={`area-${town.slug}-urgent`}>Get urgent help</a>
          </div>
        </div>
      </section>

      <section className="answers answers--compact" aria-label="Questions">
        <div className="answers-heading"><h2>Before you reach out.</h2></div>
        <div className="faq-list">
          {page.questions.map(([q, a]) => (
            <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>
          ))}
        </div>
      </section>

      <section className="related" aria-labelledby="area-nearby-title">
        <h2 className="related__title" id="area-nearby-title">Nearby communities we serve</h2>
        <ul className="link-rows link-rows--columns">
          {nearby.map((other) => (
            <li key={other.slug}><a href={areaPath(other.slug)}>{other.name}</a></li>
          ))}
          {!isBase && <li><a href={areaPath(HOME_BASE.slug)}>{HOME_BASE.name}</a></li>}
          <li><a href="/service-areas/">All service areas</a></li>
        </ul>
      </section>
      <ClosingCta />
    </div>
  );
}

export function AreasPage() {
  const base = AREA_PAGES.find((p) => p.isBase);
  return (
    <div className="page area-page">
      <section className="page-hero">
        <p className="kicker">Service area</p>
        <h1>Serving North Georgia from Dawsonville.</h1>
        <p className="page-hero__lede">Climate Simulation Solutions serves homes and businesses in Dawsonville and the communities around it, from Dahlonega and Cleveland in the mountains to Atlanta.</p>
        <div className="hero-actions in-mobile-bar">
          <a className="button button-primary" href="/book-service/" data-acquisition-event="project_form_opened" data-surface="areas">Book a service call</a>
          <a className="button button-quiet" href={PHONE_LINK} data-surface="areas">Call {PHONE_DISPLAY}</a>
        </div>
      </section>

      <section className="area area--directory" aria-labelledby="directory-title">
        <AreaMap />
        <div className="area__copy">
          <h2 id="directory-title">Communities we serve.</h2>
          <ul className="area-directory">
            <li>
              <a href={areaPath(base.slug)}>
                <strong>{HOME_BASE.name}</strong><span>{HOME_BASE.county}</span><em>Our base</em>
              </a>
            </li>
            {byDistance.map((town) => (
              <li key={town.slug}>
                <a href={areaPath(town.slug)}>
                  <strong>{town.name}</strong><span>{town.county}</span><em>{`${Math.round(milesFromBase(town))} mi`}</em>
                </a>
              </li>
            ))}
          </ul>
          <p className="area-directory__note">Somewhere else nearby? Call with the service address and the office will tell you whether we can help. The office confirms every appointment, and no arrival time is promised online.</p>
        </div>
      </section>
      <ClosingCta />
    </div>
  );
}
