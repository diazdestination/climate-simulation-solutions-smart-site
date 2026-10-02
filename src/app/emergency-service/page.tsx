import type { Metadata } from "next";
import { RequestForm } from "@/components/request-form";
import { site, phoneHref } from "@/lib/site";
import { websiteRequestsConfigured } from "@/lib/growthos";
export const metadata: Metadata = { title: "Emergency Service" };
export const dynamic = "force-dynamic";
export default function EmergencyService() {
  const enabled = websiteRequestsConfigured();
  return (
    <>
      <section className="inner-hero">
        <div className="container">
          <p className="eyebrow">PRIORITY SERVICE PATH</p>
          <h1>Need urgent help?</h1>
          <p>
            Tell us about your heating, cooling, or refrigeration issue. This path marks your
            request for priority office review. Response and appointment timing depend on
            availability.
          </p>
          {site.phone && (
            <a className="button button-primary" href={phoneHref(site.phone)}>
              Call {site.phone} <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </section>
      <section className="content-section">
        <div className="container content-grid">
          <div>
            <h2>Send a priority request</h2>
            <RequestForm intent="emergency" enabled={enabled} />
          </div>
          <aside className="info-panel">
            <p className="eyebrow">HOW THIS WORKS</p>
            <h3>Clear routing for urgent issues.</h3>
            <p>
              Priority requests are marked for the office. Sending this form does not guarantee
              immediate response or confirm an appointment.
            </p>
            {site.phone && (
              <p>
                For a time-sensitive service request, calling the office may be the fastest way to
                reach the team.
              </p>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
