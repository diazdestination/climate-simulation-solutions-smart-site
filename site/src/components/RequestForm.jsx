import { useEffect, useRef, useState } from "react";
import { FaArrowRightLong, FaCircleCheck, FaClock, FaPhone, FaTriangleExclamation } from "react-icons/fa6";
import { getLeadDeliveryStatus, isLoopbackPreview, submitLead } from "../lib/leadCapture.js";
import { getAcquisitionContext, trackAcquisition } from "../lib/acquisition.js";
import {
  ESTIMATE_QUESTIONS,
  ESTIMATE_TIMING,
  ESTIMATE_TOPICS,
  PREFERRED_WINDOWS,
  PROPERTY_TYPES,
  SERVICE_ISSUES,
  SERVICE_TIMING,
  SYSTEM_AGES,
  SYSTEM_TYPES,
  buildLeadRequest,
} from "../lib/hvacRequest.js";
import { PHONE_DISPLAY, PHONE_LINK, consentTextFor } from "../lib/siteFacts.js";
import { HoneypotField, useBotCheck } from "./BotCheck.jsx";

const FORM_IDS = { urgent: "urgent-request", service: "service-request", maintenance: "maintenance-plan", estimate: "estimate-question" };
const SUBMIT_LABEL = { urgent: "Send urgent request", service: "Send service request", maintenance: "Send plan request", estimate: "Send my question" };
const SURFACE = { urgent: "urgent", service: "service", maintenance: "maintenance", estimate: "estimate" };

const blank = (kind, defaults) => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "GA",
  zip: "",
  propertyType: "residential",
  systemType: "",
  systemAge: "",
  brand: "",
  issue: kind === "service" ? "performance" : "",
  timing: "not-sure",
  preferredWindows: [],
  preferredDate: "",
  systemCount: "",
  estimateTopic: "not-sure",
  estimateDate: "",
  estimateReference: "",
  questionType: "scope",
  notes: "",
  consent: false,
  analyticsConsent: false,
  ...defaults,
});

const Select = ({ label, value, options, onChange, disabled, id }) => (
  <label>
    <span className="field-label">{label}</span>
    <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => <option key={v || "blank"} value={v}>{l}</option>)}
    </select>
  </label>
);

const ERRORS = {
  name_invalid: "Please enter your name.",
  phone_invalid: "Please enter a 10-digit phone number.",
  email_invalid: "Please check the email address.",
  zip_invalid: "Please enter a five-digit ZIP code.",
  state_invalid: "Please use a two-letter state, for example GA.",
  contact_consent_required: "Please confirm we may call or email you about this request.",
  idempotency_conflict: "This request changed after it was first sent. Please call the office so nothing is duplicated.",
  request_too_large: "That request is too long. Please shorten the notes.",
};

export function RequestForm({ kind, defaults = {}, heading, intro }) {
  const formId = FORM_IDS[kind];
  const [form, setForm] = useState(() => blank(kind, defaults));
  const [requestId, setRequestId] = useState(null);
  const [ready, setReady] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [honeypot, setHoneypot] = useState("");
  const botCheck = useBotCheck(`request_${kind}`);
  const started = useRef(false);
  const resultRef = useRef(null);
  // The short result panel replaces a long form, so on a phone it would render above the
  // visible screen (2026-10-16 launch test: no reference was seen). Bring it into view.
  useEffect(() => {
    if (!result || !resultRef.current) return;
    resultRef.current.scrollIntoView?.({ block: "start", behavior: "smooth" });
    resultRef.current.focus?.({ preventScroll: true });
  }, [result]);
  const loopback = typeof window !== "undefined" && isLoopbackPreview();

  useEffect(() => {
    let active = true;
    setRequestId(crypto.randomUUID());
    getLeadDeliveryStatus().then((s) => active && setReady(s.ready));
    return () => {
      active = false;
    };
  }, []);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Any change makes this a different intended request: new idempotency key.
    if (key !== "analyticsConsent") setRequestId(crypto.randomUUID());
    setError("");
    if (!started.current && key !== "analyticsConsent") {
      started.current = true;
      trackAcquisition("project_form_started", { surface: SURFACE[kind], step: "details" });
    }
  };
  const toggleWindow = (id) =>
    update("preferredWindows", form.preferredWindows.includes(id) ? form.preferredWindows.filter((w) => w !== id) : [...form.preferredWindows, id]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.consent) return setError(ERRORS.contact_consent_required);
    if (form.phone.replace(/\D/g, "").length < 10) return setError(ERRORS.phone_invalid);
    if (!/^\d{5}$/.test(form.zip)) return setError(ERRORS.zip_invalid);
    if (botCheck.required && !botCheck.token) return setError("Please wait a moment while we confirm this request is from a person, then try again.");
    setBusy(true);
    setError("");
    const acquisition = form.analyticsConsent ? getAcquisitionContext() : null;
    const envelope = buildLeadRequest(kind, form, { requestId, analytics: acquisition });
    // Abuse-check fields ride alongside the envelope; the server never forwards them to GrowthOS.
    const outcome = await submitLead({ ...envelope, ...(botCheck.token ? { botCheck: botCheck.token } : {}), website: honeypot });
    setBusy(false);
    if (outcome.status === "error") {
      botCheck.reset();
      setError(
        ERRORS[outcome.code] ??
          `We couldn’t confirm your request was received. Your details are still here — please try again (it will not create a duplicate) or call ${PHONE_DISPLAY}.`,
      );
      return;
    }
    setResult(outcome);
  };

  if (result) {
    const pending = ["queued", "needs-review"].includes(result.status);
    const local = result.status === "prepared-locally";
    return (
      <div className={`request-result${pending ? " request-result--pending" : ""}${local ? " request-result--local" : ""}`} role="status" ref={resultRef} tabIndex={-1}>
        {pending ? <FaClock aria-hidden="true" /> : local ? <FaTriangleExclamation aria-hidden="true" /> : <FaCircleCheck aria-hidden="true" />}
        <p className="kicker">
          {result.status === "saved" || result.status === "sent" ? "Request received" : result.status === "queued" ? "Received · awaiting transfer" : result.status === "needs-review" ? "Received · please call" : "Local preview only"}
        </p>
        <h3>{local ? "Nothing was sent." : `Thanks, ${form.name.split(" ")[0] || "and thank you"}.`}</h3>
        <p>
          {result.status === "saved" &&
            (kind === "urgent"
              ? "Your urgent request reached the office’s request system. This does not dispatch a technician or confirm an arrival time. If you have not heard back, or the situation gets worse, call now."
              : "Your request reached the office’s request system. The office will contact you to confirm details. This is not a confirmed appointment.")}
          {result.status === "sent" &&
            (kind === "urgent"
              ? "Your urgent request was sent to the office. This does not dispatch a technician or confirm an arrival time. If you have not heard back, or the situation gets worse, call now."
              : "Your request was sent to the office. The office will contact you to confirm details. This is not a confirmed appointment.")}
          {result.status === "queued" && "Your details are securely held by this website and transfer to the office is being retried. No appointment or arrival time is confirmed. Please call if you need help now."}
          {result.status === "needs-review" && "Your details are securely held, but transfer to the office needs attention. Please call and mention this reference."}
          {local && "This local preview is not connected to the office’s request system, so your details were not delivered to anyone. Please call to reach the office."}
        </p>
        {!local && result.reference && <p className="request-reference">Reference: {result.reference}</p>}
        <a className="button button-primary" href={PHONE_LINK} data-surface={SURFACE[kind]}>
          <FaPhone aria-hidden="true" /> Call {PHONE_DISPLAY}
        </a>
      </div>
    );
  }

  const field = (key, label, props = {}) => (
    <label className={props.wide ? "field-wide" : undefined}>
      <span className="field-label">{label}</span>
      <input value={form[key]} disabled={busy} onChange={(e) => update(key, props.digits ? e.target.value.replace(/\D/g, "") : e.target.value)} {...props.input} />
    </label>
  );

  return (
    <form className="request-form" onSubmit={submit} noValidate={false} aria-describedby={`${formId}-intro`}>
      {heading && <h3 className="request-form__heading">{heading}</h3>}
      <p className="request-form__intro" id={`${formId}-intro`}>{intro}</p>

      {kind === "service" && (
        <fieldset>
          <legend>What’s going on?</legend>
          <div className="field-grid">
            <Select label="Issue type" value={form.issue} disabled={busy} onChange={(v) => update("issue", v)} options={SERVICE_ISSUES.map((i) => [i.id, i.label])} />
            <Select label="Property" value={form.propertyType} disabled={busy} onChange={(v) => update("propertyType", v)} options={PROPERTY_TYPES} />
          </div>
          {SERVICE_ISSUES.find((i) => i.id === form.issue)?.urgentHint && (
            <p className="inline-hint">
              <FaTriangleExclamation aria-hidden="true" /> No heat or no cooling right now? Use the <a href="/urgent/">urgent help path</a> or call {PHONE_DISPLAY}.
            </p>
          )}
        </fieldset>
      )}

      {kind === "estimate" && (
        <fieldset>
          <legend>About your estimate</legend>
          <div className="field-grid">
            <Select label="The estimate was for" value={form.estimateTopic} disabled={busy} onChange={(v) => update("estimateTopic", v)} options={ESTIMATE_TOPICS} />
            <Select label="My question is about" value={form.questionType} disabled={busy} onChange={(v) => update("questionType", v)} options={ESTIMATE_QUESTIONS} />
            {field("estimateDate", "When you received it (optional)", { input: { maxLength: 60, placeholder: "For example: last week" } })}
            {field("estimateReference", "Estimate number, if shown (optional)", { input: { maxLength: 40 } })}
            <Select label="Where you are" value={form.timing} disabled={busy} onChange={(v) => update("timing", v)} options={ESTIMATE_TIMING} />
          </div>
        </fieldset>
      )}

      {kind === "maintenance" && (
        <fieldset>
          <legend>Plan interest</legend>
          <div className="plan-choice" role="radiogroup" aria-label="Plan type">
            {[
              ["residential", "Residential", "One visit every six months"],
              ["commercial", "Commercial", "Quarterly visits"],
            ].map(([id, title, cadence]) => (
              <label key={id} className={`plan-choice__option${form.propertyType === id ? " is-selected" : ""}`}>
                <input type="radio" name={`${formId}-plan`} value={id} checked={form.propertyType === id} disabled={busy} onChange={() => update("propertyType", id)} />
                <strong>{title}</strong>
                <span>{cadence} · billed annually</span>
              </label>
            ))}
          </div>
          <div className="field-grid">
            <Select label="Number of systems" value={form.systemCount} disabled={busy} onChange={(v) => update("systemCount", v)} options={[["", "Choose if known"], ["1", "1"], ["2", "2"], ["3+", "3 or more"], ["not-sure", "Not sure"]]} />
          </div>
        </fieldset>
      )}

      {kind !== "estimate" && (
        <fieldset>
          <legend>Your equipment (if known)</legend>
          <div className="field-grid">
            <Select label="System type" value={form.systemType} disabled={busy} onChange={(v) => update("systemType", v)} options={SYSTEM_TYPES} />
            <Select label="Approximate age" value={form.systemAge} disabled={busy} onChange={(v) => update("systemAge", v)} options={SYSTEM_AGES} />
            {field("brand", "Brand (optional)", { input: { maxLength: 60, autoComplete: "off" } })}
            {kind === "urgent" && <Select label="Property" value={form.propertyType} disabled={busy} onChange={(v) => update("propertyType", v)} options={PROPERTY_TYPES} />}
          </div>
        </fieldset>
      )}

      {(kind === "service" || kind === "maintenance") && (
        <fieldset>
          <legend>Preferred times <small>(a request — the office confirms the actual appointment)</small></legend>
          <div className="window-chips">
            {PREFERRED_WINDOWS.map(([id, label]) => (
              <label key={id} className={`chip-check${form.preferredWindows.includes(id) ? " is-checked" : ""}`}>
                <input type="checkbox" checked={form.preferredWindows.includes(id)} disabled={busy} onChange={() => toggleWindow(id)} />
                {label}
              </label>
            ))}
          </div>
          {kind === "service" && (
            <div className="field-grid">
              {field("preferredDate", "Preferred day (optional)", { input: { maxLength: 60, placeholder: "For example: Tuesday or after the 20th" } })}
              <Select label="How soon" value={form.timing} disabled={busy} onChange={(v) => update("timing", v)} options={SERVICE_TIMING} />
            </div>
          )}
        </fieldset>
      )}

      <fieldset>
        <legend>Contact and service address</legend>
        <div className="field-grid">
          {field("name", "Your name", { input: { required: true, minLength: 2, maxLength: 100, autoComplete: "name" } })}
          {field("phone", "Phone", { input: { required: true, type: "tel", maxLength: 30, autoComplete: "tel" } })}
          {field("email", "Email (optional)", { input: { type: "email", maxLength: 254, autoComplete: "email" } })}
          {field("address", "Service address", { input: { required: true, maxLength: 180, autoComplete: "street-address" } })}
          {field("city", "City", { input: { required: true, maxLength: 100, autoComplete: "address-level2" } })}
          <div className="field-pair">
            {field("state", "State", { input: { required: true, maxLength: 2, autoComplete: "address-level1", pattern: "[A-Za-z]{2}" } })}
            {field("zip", "ZIP", { digits: true, input: { required: true, inputMode: "numeric", pattern: "[0-9]{5}", maxLength: 5, autoComplete: "postal-code" } })}
          </div>
        </div>
      </fieldset>

      <label className="field-wide">
        <span className="field-label">{kind === "estimate" ? "Your question" : "Anything else the office should know? (optional)"}</span>
        <textarea rows={3} maxLength={1200} disabled={busy} value={form.notes} onChange={(e) => update("notes", e.target.value)} required={kind === "estimate"}
          placeholder={kind === "urgent" ? "What the system is doing and when it started" : kind === "estimate" ? "What would you like to ask about the estimate?" : "Symptoms, access notes, or questions"} />
      </label>

      <label className="consent-check">
        <input type="checkbox" checked={form.consent} disabled={busy} onChange={(e) => update("consent", e.target.checked)} />
        <span>
          {consentTextFor(formId)} See our <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.
        </span>
      </label>
      <label className="consent-check consent-check--optional">
        <input type="checkbox" checked={form.analyticsConsent} disabled={busy} onChange={(e) => update("analyticsConsent", e.target.checked)} />
        <span>Optional: include how I found this website (campaign and referring site) so the office can understand which pages help. No cross-site tracking.</span>
      </label>

      <HoneypotField value={honeypot} onChange={setHoneypot} />
      {botCheck.element}
      <p className="delivery-notice">
        {ready === false && loopback
          ? "Local preview: the office’s request system is not connected here, so sending will not deliver anything."
          : "After you send, this page tells you whether your request reached the office or is securely held for transfer. For immediate help, call."}
      </p>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="request-actions">
        <a className="text-link" href={PHONE_LINK} data-surface={SURFACE[kind]}>Prefer to call? {PHONE_DISPLAY}</a>
        <button className="button button-primary" type="submit" disabled={busy || !requestId}>
          {busy ? "Sending…" : SUBMIT_LABEL[kind]} <FaArrowRightLong aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
