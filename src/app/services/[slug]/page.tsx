import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return site.services.map((service) => ({ slug: service.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = site.services.find((item) => item.slug === slug);
  return { title: service?.title || "Service" };
}
export default async function ServiceDetail({ params }: Props) {
  const { slug } = await params;
  const service = site.services.find((item) => item.slug === slug);
  if (!service) notFound();
  return (
    <>
      <section className="inner-hero">
        <div className="container">
          <p className="eyebrow">{service.number} / SERVICE</p>
          <h1>{service.title}.</h1>
          <p>
            {service.detail} Tell us what you need and our office will discuss the next step with
            you.
          </p>
          <Link className="button button-primary" href="/book-service">
            Book Service <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <section className="content-section">
        <div className="container content-grid">
          <div>
            <h2>Start with a clear request.</h2>
            <p>
              Describe the symptoms, your location, and your preferred timing. Our office reviews
              every request and confirms appointments directly.
            </p>
            <Link className="text-link" href="/book-service">
              Request {service.title.toLowerCase()} service ↗
            </Link>
          </div>
          <aside className="info-panel">
            <p className="eyebrow">LOCAL SERVICE</p>
            <h3>Tri-County focused.</h3>
            <p>
              Serving Riverton, Eastbrook, Mason County, Lakeside communities, and surrounding
              areas.
            </p>
            <Link className="text-link" href="/service-areas">
              See service areas ↗
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
