import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
export const metadata: Metadata = { title: "Services" };
export default function Services() {
  return (
    <>
      <section className="inner-hero">
        <div className="container">
          <p className="eyebrow">HEATING / COOLING / REFRIGERATION</p>
          <h1>Service for every season.</h1>
          <p>
            Practical help for homeowners, property managers, and commercial spaces across North
            Georgia.
          </p>
        </div>
      </section>
      <section className="content-section">
        <div className="container page-services">
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
      </section>
    </>
  );
}
