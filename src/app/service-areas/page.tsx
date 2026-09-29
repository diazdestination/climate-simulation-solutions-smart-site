import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
export const metadata: Metadata = { title: "Service Areas" };
export default function ServiceAreas() {
  return (
    <>
      <section className="inner-hero">
        <div className="container">
          <p className="eyebrow">NORTH GEORGIA / LOCAL SERVICE</p>
          <h1>Close to home.</h1>
          <p>
            We serve communities across North Georgia. If you are unsure whether your location is
            covered, send a request and the office can confirm.
          </p>
        </div>
      </section>
      <section className="content-section">
        <div className="container content-grid">
          <div className="area-list">
            {site.serviceAreas.map((area, index) => (
              <div key={area}>
                <span>0{index + 1}</span>
                <strong>{area}</strong>
              </div>
            ))}
          </div>
          <aside className="info-panel">
            <p className="eyebrow">YOUR NEXT STEP</p>
            <h3>Ask about your address.</h3>
            <p>We will confirm service availability for your area before scheduling.</p>
            <Link className="button button-primary" href="/book-service">
              Book Service ↗
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
