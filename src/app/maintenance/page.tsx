import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Maintenance" };
export default function Maintenance() {
  return (
    <>
      <section className="inner-hero">
        <div className="container">
          <p className="eyebrow">MAINTENANCE / STAY READY</p>
          <h1>Care for the long run.</h1>
          <p>
            Climate Simulation Solutions offers an existing maintenance membership and service
            agreement. Ask the office about current coverage and enrollment.
          </p>
          <Link className="button button-primary" href="/book-service?intent=maintenance">
            Ask About Maintenance ↗
          </Link>
        </div>
      </section>
      <section className="content-section">
        <div className="container content-grid">
          <div>
            <h2>Make upkeep easier.</h2>
            <p>
              Regular service helps you stay aware of your system’s condition. The office can
              explain the current program, its terms, and how it fits your equipment.
            </p>
          </div>
          <aside className="info-panel">
            <p className="eyebrow">FOR CURRENT CUSTOMERS</p>
            <h3>Already a member?</h3>
            <p>
              Use a service request to ask about your agreement or schedule maintenance. The office
              will confirm the details.
            </p>
            <Link className="text-link" href="/book-service?intent=maintenance">
              Book Service ↗
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
