import type { Metadata } from "next";
import Link from "next/link";
import { approvedTestimonials } from "@/lib/site";
export const metadata: Metadata = { title: "Customer Reviews" };
export default function Reviews() {
  return (
    <>
      <section className="inner-hero">
        <div className="container">
          <p className="eyebrow">CUSTOMER FEEDBACK</p>
          <h1>Real words matter.</h1>
          <p>
            Customer stories will be shown here when they are verified and approved for publication.
          </p>
        </div>
      </section>
      <section className="content-section">
        <div className="container">
          {approvedTestimonials.length ? (
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
          ) : (
            <div className="review-empty">
              <h2>Customer stories are on the way.</h2>
              <p>
                We are preparing verified feedback for this page. In the meantime, our office can
                answer your questions about service.
              </p>
              <Link className="text-link" href="/book-service">
                Book Service ↗
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
