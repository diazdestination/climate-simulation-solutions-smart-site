import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Financing" };
export default function Financing() {
  return (
    <>
      <section className="inner-hero">
        <div className="container">
          <p className="eyebrow">SYSTEM REPLACEMENT / OPTIONS</p>
          <h1>Plan your next system.</h1>
          <p>
            Financing is offered for larger HVAC jobs. Our office can explain current options,
            eligibility, and the next steps for a replacement estimate.
          </p>
          <Link className="button button-primary" href="/book-service?intent=estimate">
            Request an Estimate ↗
          </Link>
        </div>
      </section>
      <section className="content-section">
        <div className="container content-grid">
          <div>
            <h2>A conversation first.</h2>
            <p>
              Tell us about your current equipment and what you are hoping to improve. We will help
              you start an estimate request and discuss available financing information.
            </p>
          </div>
          <aside className="info-panel">
            <p className="eyebrow">PLEASE NOTE</p>
            <h3>Terms come from the provider.</h3>
            <p>
              Rates, terms, approval, and availability should be reviewed with the office and
              financing provider. No financing terms are advertised here yet.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
