import Link from "next/link";
import { site, phoneHref } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="topline">
        <div className="container topline-inner">
          <span>Serving North Georgia homes & businesses</span>
          {site.phone ? (
            <a href={phoneHref(site.phone)}>Call {site.phone}</a>
          ) : (
            <span>Service requests reviewed by our office</span>
          )}
        </div>
      </div>
      <div className="nav-bar">
        <div className="container nav-row">
          <Link className="brand" href="/" aria-label={`${site.shortName} home`}>
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            <span className="brand-copy">
              <strong>CLIMATE</strong>
              <small>SIMULATION SOLUTIONS</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/services">Services</Link>
            <Link href="/emergency-service">Emergency</Link>
            <Link href="/maintenance">Maintenance</Link>
            <Link href="/about">About</Link>
          </nav>
          <Link className="button button-primary nav-cta" href="/book-service">
            Book Service <span aria-hidden="true">↗</span>
          </Link>
          <details className="mobile-menu">
            <summary aria-label="Open navigation menu">☰</summary>
            <nav aria-label="Mobile navigation">
              <Link href="/services">Services</Link>
              <Link href="/emergency-service">Emergency Service</Link>
              <Link href="/maintenance">Maintenance</Link>
              <Link href="/financing">Financing</Link>
              <Link href="/service-areas">Service Areas</Link>
              <Link href="/about">About</Link>
              <Link href="/reviews">Reviews</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
