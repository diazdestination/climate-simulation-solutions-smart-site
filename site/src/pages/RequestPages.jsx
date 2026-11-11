import { useEffect, useState } from "react";
import { FaCalendarCheck, FaEnvelope, FaPhone } from "react-icons/fa6";
import { RequestForm } from "../components/RequestForm.jsx";
import { SERVICE_ISSUES } from "../lib/hvacRequest.js";
import { MAINTENANCE, PHONE_DISPLAY, PHONE_LINK, visitsAYear } from "../lib/siteFacts.js";
import { openAssistant } from "../components/Layout.jsx";

/** Reads a whitelisted query parameter after mount (prerendered HTML stays generic). */
function useQueryChoice(name, allowed, fallback) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get(name);
    if (v && allowed.includes(v)) setValue(v);
  }, []);
  return value;
}

function PageHero({ kicker, title, lede, children }) {
  return (
    <section className="page-hero">
      <p className="kicker">{kicker}</p>
      <h1>{title}</h1>
      <p className="page-hero__lede">{lede}</p>
      {children}
    </section>
  );
}

export function BookServicePage() {
  const issue = useQueryChoice("issue", SERVICE_ISSUES.map((i) => i.id), "performance");
  return (
    <div className="page">
      <PageHero kicker="Book a service call" title="Request a service call." lede="Tell us what’s going on and when works best. This is a request: the office reviews it and contacts you to confirm an appointment time.">
        <p className="page-hero__note">No heat or no AC right now? <a href="/urgent/">Use the urgent path</a> or call <a href={PHONE_LINK}>{PHONE_DISPLAY}</a>.</p>
      </PageHero>
      <section className="request-layout">
        <RequestForm kind="service" key={issue} defaults={{ issue }} intro="Your name, phone and service address let the office reach you and find the property. Email is optional. The website never books a confirmed time." />
        <aside className="request-aside">
          <h2>What happens next</h2>
          <ol className="steps">
            <li><strong>You send the request.</strong> It goes to the office with your preferred times.</li>
            <li><strong>The office reviews it.</strong> Availability depends on location, equipment and the type of work.</li>
            <li><strong>The office confirms with you.</strong> You’ll get a call or email to set the actual appointment.</li>
          </ol>
          <p>Prefer to talk it through first? <button type="button" className="link-button" onClick={openAssistant}>Ask the AI assistant</button> or call <a href={PHONE_LINK}>{PHONE_DISPLAY}</a>.</p>
        </aside>
      </section>
    </div>
  );
}

/** One plan: its name, the figure that sets it apart, the approved cadence wording, the terms. */
function PlanCard({ tone, name, cadence, children }) {
  const visits = visitsAYear(cadence);
  return (
    <article className={`plan-card tone-${tone}`}>
      <h2>{name}</h2>
      {visits && <p className="plan-card__figure"><b>{visits}</b> <span>visits a year</span></p>}
      <p className="plan-card__cadence">{cadence}</p>
      <ul>{children}</ul>
    </article>
  );
}

export function MaintenancePage() {
  const plan = useQueryChoice("plan", ["residential", "commercial"], "residential");
  return (
    <div className="page">
      <PageHero kicker="Maintenance plans" title="Regular care, on a schedule." lede="Maintenance plans keep your heating and cooling equipment on a regular visit schedule. Plans are billed annually; the office explains what’s included and current pricing." />
      <section className="plan-grid" aria-label="Plan types">
        <PlanCard tone="warm" name="Residential" cadence={MAINTENANCE.residential}>
          <li>{MAINTENANCE.billing}</li>
          <li>If your system had major service between visits, the office may adjust when the next visit is due.</li>
          <li>Pricing provided by the office.</li>
        </PlanCard>
        <PlanCard tone="cool" name="Commercial" cadence={MAINTENANCE.commercial}>
          <li>{MAINTENANCE.billing}</li>
          <li>Share the facility and how many systems you have so the office can confirm fit.</li>
          <li>Pricing provided by the office.</li>
        </PlanCard>
      </section>
      <section className="request-layout">
        <RequestForm kind="maintenance" key={plan} defaults={{ propertyType: plan }} heading="Ask to join a maintenance plan" intro="Sending this is a request, not an enrollment or a charge. The office contacts you to explain the plan, pricing and the first visit." />
        <aside className="request-aside">
          <h2>Good to know</h2>
          <p><FaCalendarCheck aria-hidden="true" /> Visit times are confirmed by the office. The website does not schedule plan visits or take payment.</p>
          <p>Need service before a plan starts? <a href="/book-service/?issue=maintenance">Book a one-time maintenance visit</a>.</p>
        </aside>
      </section>
    </div>
  );
}

export function EstimatePage() {
  return (
    <div className="page">
      <PageHero kicker="After your estimate" title="Questions about your estimate?" lede="Estimates come from the office after the property and equipment are reviewed. Here’s what happens next — and how to ask a question." />
      <section className="estimate-steps" aria-labelledby="estimate-steps-title">
        <h2 id="estimate-steps-title">What happens after you receive an estimate</h2>
        <ol className="steps steps--wide">
          <li><strong>Take your time to review it.</strong> Look over what’s included and note anything you’d like explained.</li>
          <li><strong>The office follows up.</strong> If you haven’t responded, the office may check in by phone or email to answer questions. You can decline at any time.</li>
          <li><strong>Ask anything, any time.</strong> Call the office or send a question below. Sending a question does not accept, decline or change the estimate.</li>
        </ol>
        <div className="estimate-contact">
          <a className="button button-primary in-mobile-bar" href={PHONE_LINK} data-surface="estimate"><FaPhone aria-hidden="true" /> Call {PHONE_DISPLAY}</a>
          <p><FaEnvelope aria-hidden="true" /> Follow-ups come from the office. This website never sends messages on its own.</p>
        </div>
      </section>
      <section className="request-layout">
        <RequestForm kind="estimate" heading="I received an estimate and have a question" intro="Share what the estimate was for and your question. The office replies by phone or email." />
        <aside className="request-aside">
          <h2>Please don’t include</h2>
          <p>Card numbers, bank details or passwords. The office never asks for payment information through this website.</p>
        </aside>
      </section>
    </div>
  );
}

export function AssistantPage() {
  return (
    <div className="page">
      <PageHero kicker="AI website assistant · private preview" title="Talk through your heating or cooling question." lede="The assistant helps organize what’s happening and points you to the right request. It can’t diagnose, quote prices, book or dispatch — and it doesn’t submit anything for you.">
        <div className="hero-actions">
          <button className="button button-primary" type="button" onClick={openAssistant}>Open the assistant</button>
          <a className="button button-quiet in-mobile-bar" href={PHONE_LINK}>Call {PHONE_DISPLAY}</a>
        </div>
      </PageHero>
    </div>
  );
}
