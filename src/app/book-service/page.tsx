import type { Metadata } from "next";
import { RequestForm } from "@/components/request-form";
export const metadata: Metadata = { title: "Book Service" };
export const dynamic = "force-dynamic";
export default async function BookService({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent: requestedIntent } = await searchParams;
  const intent =
    requestedIntent === "estimate" || requestedIntent === "maintenance"
      ? requestedIntent
      : "booking";
  const enabled = Boolean(
    process.env.GROWTHOS_LEAD_WEBHOOK_URL && process.env.GROWTHOS_LEAD_WEBHOOK_TOKEN,
  );
  return (
    <>
      <section className="inner-hero">
        <div className="container">
          <p className="eyebrow">BOOK SERVICE / START HERE</p>
          <h1>Tell us what you need.</h1>
          <p>
            A few details are all it takes to request service. Our office will review your request
            and contact you before an appointment is confirmed.
          </p>
        </div>
      </section>
      <section className="content-section">
        <div className="container content-grid">
          <div>
            <h2>
              {intent === "estimate"
                ? "Request an estimate"
                : intent === "maintenance"
                  ? "Ask about maintenance"
                  : "Request service"}
            </h2>
            <RequestForm intent={intent} enabled={enabled} />
          </div>
          <aside className="info-panel">
            <p className="eyebrow">WHAT HAPPENS NEXT</p>
            <h3>We take it from here.</h3>
            <p>
              After receiving your request, our office reviews the details, discusses availability,
              and confirms the appointment with you.
            </p>
            <p>
              Need urgent help? Use the dedicated emergency service path so your request is marked
              as a priority.
            </p>
            <a className="text-link" href="/emergency-service">
              Emergency Service ↗
            </a>
          </aside>
        </div>
      </section>
    </>
  );
}
