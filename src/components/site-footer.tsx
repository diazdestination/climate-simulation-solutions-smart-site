import Link from "next/link";
import { site, phoneHref } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <p className="eyebrow">NORTHLINE HEATING & AIR LLC</p>
          <h2>Comfort starts with a conversation.</h2>
          <p>Local, family-owned HVAC and refrigeration service across the Tri-County area.</p>
          <Link className="button button-primary" href="/book-service">
            Book Service <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="footer-links">
          <div>
            <strong>Explore</strong>
            <Link href="/services">Services</Link>
            <Link href="/emergency-service">Emergency Service</Link>
            <Link href="/maintenance">Maintenance</Link>
            <Link href="/financing">Financing</Link>
          </div>
          <div>
            <strong>Company</strong>
            <Link href="/about">About</Link>
            <Link href="/reviews">Customer Reviews</Link>
            <Link href="/service-areas">Service Areas</Link>
            {site.phone && <a href={phoneHref(site.phone)}>Call {site.phone}</a>}
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Northline Heating & Air LLC</span>
        <span>the Tri-County area</span>
      </div>
    </footer>
  );
}
