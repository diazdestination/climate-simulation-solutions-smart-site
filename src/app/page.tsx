import Link from "next/link";
import { approvedTestimonials, site, phoneHref } from "@/lib/site";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="container hero-layout">
          <div className="hero-content">
            <p className="eyebrow">
              <span className="signal-dot" /> NORTH GEORGIA HVAC & REFRIGERATION
            </p>
            <h1>
              Comfort,
              <br />
              <em>engineered</em>
              <br />
              for real life.
            </h1>
            <p className="hero-description">
              Heating, cooling, and refrigeration help from a local, family-owned team. Tell us what
              is happening, and our office will help you find the next step.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary button-large" href="/book-service">
                Book Service <span aria-hidden="true">↗</span>
              </Link>
              <Link className="button button-outline button-large" href="/emergency-service">
                Need urgent help?
              </Link>
            </div>
            <div className="hero-meta">
              <span>01 / A SIMPLE REQUEST</span>
              <span>02 / OFFICE REVIEW</span>
              <span>03 / CLEAR NEXT STEPS</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="visual-ring ring-one" />
            <div className="visual-ring ring-two" />
            <div className="visual-core">
              <div className="core-shine" />
            </div>
            <div className="visual-caption">
              <span className="caption-line" /> COMFORT IN MOTION <span>•</span> NORTH GEORGIA
            </div>
            <div className="visual-coordinate">34° NORTH / BUILT FOR HERE</div>
          </div>
        </div>
      </section>
      <section className="trust-strip">
        <div className="container trust-inner">
          <span>LOCAL & FAMILY-OWNED</span>
          <span>RESIDENTIAL + COMMERCIAL</span>
          <span>NORTH GEORGIA FOCUSED</span>
          <span>OFFICE-REVIEWED REQUESTS</span>
        </div>
      </section>
      <section className="section" id="services">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / WHAT WE DO</p>
              <h2>One team. Every season.</h2>
            </div>
            <p>
              From a cooling problem at home to refrigeration needs at work, start with a clear
              service request.
            </p>
          </div>
          <div className="service-grid">
            {site.services.map((service) => (
              <Link className="service-card" href={`/services/${service.slug}`} key={service.slug}>
                <span className="card-number">{service.number} / SERVICE</span>
                <span className="card-arrow" aria-hidden="true">
                  ↗
                </span>
                <h3>{service.title}</h3>
                <p>{service.detail}</p>
              </Link>
            ))}
          </div>
          <div className="section-end">
            <Link className="text-link" href="/services">
              Explore all services <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
      <section className="emergency-band">
        <div className="container emergency-layout">
          <div>
            <p className="eyebrow">02 / PRIORITY ROUTING</p>
            <h2>When comfort can’t wait.</h2>
            <p>
              For urgent heating, cooling, or refrigeration issues, use the dedicated emergency
              path. Share the situation so our office can prioritize the request.
            </p>
            <div className="inline-actions">
              <Link className="button button-light" href="/emergency-service">
                Emergency Service <span aria-hidden="true">↗</span>
              </Link>
              {site.phone && (
                <a className="emergency-phone" href={phoneHref(site.phone)}>
                  Call {site.phone}
                </a>
              )}
            </div>
          </div>
          <div className="emergency-art" aria-hidden="true">
            <span>!</span>
            <div className="emergency-art-label">
              PRIORITY
              <br />
              SERVICE PATH
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">03 / HOW IT WORKS</p>
              <h2>
                Easy to start.
                <br />
                Clear from there.
              </h2>
            </div>
            <p>
              Requesting service should never feel like a maze. We keep the first step short and
              explain what happens next.
            </p>
          </div>
          <div className="steps">
            <div>
              <span>01</span>
              <h3>Tell us what you need</h3>
              <p>Choose a service and share the essentials.</p>
            </div>
            <div>
              <span>02</span>
              <h3>Our office reviews it</h3>
              <p>We check your request and reach out about availability.</p>
            </div>
            <div>
              <span>03</span>
              <h3>Get confirmation</h3>
              <p>Your appointment is confirmed only after the office approves it.</p>
            </div>
          </div>
          <Link className="button button-primary" href="/book-service">
            Book Service <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <section className="split-section">
        <div className="container split-grid">
          <div className="split-panel plan-panel">
            <p className="eyebrow">04 / STAY READY</p>
            <h2>Care that goes beyond the repair.</h2>
            <p>
              Already thinking ahead? Ask about the existing maintenance membership and service
              agreement.
            </p>
            <Link className="text-link" href="/maintenance">
              Explore maintenance <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="split-panel finance-panel">
            <p className="eyebrow">05 / BIGGER PROJECTS</p>
            <h2>Options for the next chapter.</h2>
            <p>
              Considering a system replacement? Financing is offered for larger HVAC jobs. The
              office can explain current options and eligibility.
            </p>
            <Link className="text-link" href="/financing">
              Ask about financing <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
      {approvedTestimonials.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">06 / REAL STORIES</p>
                <h2>Words from our customers.</h2>
              </div>
              <Link className="text-link" href="/reviews">
                See reviews <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="testimonial-grid">
              {approvedTestimonials.map((item) => (
                <blockquote key={`${item.name}-${item.quote}`}>
                  <p>“{item.quote}”</p>
                  <footer>
                    {item.name}
                    {item.source ? ` · ${item.source}` : ""}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="area-section">
        <div className="container area-layout">
          <div>
            <p className="eyebrow">ROOTED IN NORTH GEORGIA</p>
            <h2>
              Close to home.
              <br />
              Ready to help.
            </h2>
            <p>
              Serving Dawsonville, Cumming, Gainesville, Lake Lanier communities, and surrounding
              North Georgia areas.
            </p>
            <Link className="text-link" href="/service-areas">
              Explore service areas <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="area-list">
            {site.serviceAreas.map((area, index) => (
              <div key={area}>
                <span>0{index + 1}</span>
                <strong>{area}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="final-cta">
        <div className="container">
          <p className="eyebrow">LET’S GET YOU COMFORTABLE</p>
          <h2>Start with a service request.</h2>
          <p>
            Give us a few details. Our office will follow up to discuss the next step and confirm
            any appointment.
          </p>
          <Link className="button button-dark button-large" href="/book-service">
            Book Service <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </>
  );
}
