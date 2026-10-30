import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "About" };
export default function About() {
  return (
    <>
      <section className="inner-hero">
        <div className="container">
          <p className="eyebrow">LOCAL / FAMILY-OWNED</p>
          <h1>Built around the people we serve.</h1>
          <p>
            Northline Heating & Air is a local, family-owned business serving the Tri-County area
            homeowners and businesses with HVAC and refrigeration service.
          </p>
        </div>
      </section>
      <section className="content-section">
        <div className="container content-grid">
          <div>
            <h2>Practical service. Human follow-through.</h2>
            <p>
              The goal is simple: make it easy to reach the team, explain your needs, and understand
              what happens next. Every online appointment request is reviewed by the office before
              confirmation.
            </p>
            <Link className="button button-primary" href="/book-service">
              Book Service ↗
            </Link>
          </div>
          <aside className="info-panel">
            <p className="eyebrow">OUR SERVICE AREA</p>
            <h3>The Tri-County area is home.</h3>
            <p>Riverton, Eastbrook, Mason County, Lakeside communities, and surrounding areas.</p>
            <Link className="text-link" href="/service-areas">
              Explore service areas ↗
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
