// Service and service-area pages (adapted from the reference OrganicPage pattern).
import { FaArrowRightLong } from "react-icons/fa6";
import { AREA_PAGES, AVAILABILITY_CHECK_COMMUNITIES, SERVICE_PAGES, areaPath, servicePath } from "../content/pages.js";
import { PHONE_DISPLAY, PHONE_LINK } from "../lib/siteFacts.js";
import { ClosingCta } from "./HomePage.jsx";

export function ContentPage({ page }) {
  return (
    <div className="page content-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span>/</span><span>{page.eyebrow}</span>
      </nav>
      <section className="page-hero">
        <p className="kicker">{page.eyebrow}</p>
        <h1>{page.headline}</h1>
        <p className="page-hero__lede">{page.lede}</p>
        <div className="hero-actions">
          <a className="button button-primary" href={page.primaryAction.href}>{page.primaryAction.label} <FaArrowRightLong aria-hidden="true" /></a>
          <a className="button button-quiet" href={PHONE_LINK} data-surface="content">Call {PHONE_DISPLAY}</a>
        </div>
      </section>
      <div className="content-sections">
        {page.sections.map((section, i) => (
          <section key={section.title} className="content-section">
            <p className="kicker">{String(i + 1).padStart(2, "0")} / What to know</p>
            <h2>{section.title}</h2>
            {section.body.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
          </section>
        ))}
      </div>
      {page.questions?.length > 0 && (
        <section className="answers answers--compact" aria-label="Questions">
          <div className="answers-heading"><p className="kicker">Straight answers</p><h2>Before you reach out.</h2></div>
          <div className="faq-list">
            {page.questions.map(([q, a]) => (
              <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>
            ))}
          </div>
        </section>
      )}
      <section className="related" aria-label="Other services">
        <p className="kicker">Other services</p>
        <div className="related-grid">
          {SERVICE_PAGES.filter((p) => p.slug !== page.slug).map((p) => (
            <a key={p.slug} href={servicePath(p.slug)} className="related-card"><small>Service</small><strong>{p.eyebrow}</strong><span>Explore <FaArrowRightLong aria-hidden="true" /></span></a>
          ))}
        </div>
      </section>
      <ClosingCta />
    </div>
  );
}

export function AreasPage() {
  return (
    <div className="page content-page">
      <section className="page-hero">
        <p className="kicker">Service area</p>
        <h1>Based in Dawsonville, Georgia.</h1>
        <p className="page-hero__lede">Climate Simulation Solutions is based in Dawsonville and serves surrounding North Georgia communities. Availability depends on the address, the equipment, timing and the type of work, so please call with your service address to confirm.</p>
        <div className="hero-actions">
          <a className="button button-primary" href={PHONE_LINK} data-surface="areas">Check your address: {PHONE_DISPLAY}</a>
          <a className="button button-quiet" href="/book-service/">Book a service call</a>
        </div>
      </section>
      <section className="content-section">
        <h2>Communities you can call to check</h2>
        <p>These nearby communities are places where you can call to check availability. Listing a community is not a promise of service at every address or of emergency coverage.</p>
        <div className="city-chips city-chips--large">{AVAILABILITY_CHECK_COMMUNITIES.map((c) => <span key={c}>{c}</span>)}</div>
      </section>
      <section className="related" aria-label="Area pages">
        <p className="kicker">Area pages</p>
        <div className="related-grid">
          {AREA_PAGES.map((p) => (
            <a key={p.slug} href={areaPath(p.slug)} className="related-card"><small>Area</small><strong>{p.eyebrow}</strong><span>Explore <FaArrowRightLong aria-hidden="true" /></span></a>
          ))}
        </div>
      </section>
      <ClosingCta />
    </div>
  );
}
