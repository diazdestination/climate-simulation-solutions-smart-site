"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { site } from "@/lib/site";
import { CONTACT_CONSENT_TEXT } from "@/lib/request-policy.mjs";

type Intent = "booking" | "emergency" | "estimate" | "maintenance";
type Status =
  "restoring" | "idle" | "sending" | "saved" | "queued" | "review" | "uncertain" | "error";
const storageKey = "css-service-request-v1";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function remember(requestId: string | null) {
  try {
    if (requestId) sessionStorage.setItem(storageKey, requestId);
    else sessionStorage.removeItem(storageKey);
  } catch {
    /* A blocked storage API must not prevent a request. */
  }
}

export function RequestForm({ intent, enabled }: { intent: Intent; enabled: boolean }) {
  const [status, setStatus] = useState<Status>("restoring");
  const [reference, setReference] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [allowSeparate, setAllowSeparate] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const requestId = useRef<string | null>(null);
  const snapshot = useRef<Record<string, unknown> | null>(null);
  const held = ["saved", "queued", "review", "uncertain"].includes(status);

  const applyResponse = useCallback(async (response: Response, expectedId: string) => {
    const data = await response.json();
    if (data.requestId === expectedId && data.appointmentStatus === "pending_office_approval") {
      if (response.ok && data.status === "saved") {
        snapshot.current = null;
        setCanRetry(false);
        formRef.current?.reset();
        setStatus("saved");
        setMessage(
          "Your request is in the office inbox. The office will review it and contact you. Your appointment is not confirmed yet.",
        );
        return;
      }
      if (response.ok && data.status === "queued" && data.retained === true) {
        setStatus("queued");
        setMessage(
          "Your request is stored securely for another delivery attempt. Delivery to the office is not confirmed yet. Please keep this reference and check the delivery status.",
        );
        return;
      }
      if (data.status === "needs-review" && typeof data.retained === "boolean") {
        setStatus("review");
        setMessage(
          data.retained
            ? "Your request is stored, but delivery to the office needs attention. An appointment is not confirmed. Please use the office phone number when available and quote this reference."
            : "Delivery could not be confirmed, and the stored request has expired. Please use the office phone number when available or start a separate request.",
        );
        return;
      }
    }
    throw new Error("Delivery is unconfirmed");
  }, []);

  const checkDelivery = useCallback(
    async (id: string) => {
      setChecking(true);
      try {
        const response = await fetch("/api/requests/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: id }),
          signal: AbortSignal.timeout(12000),
          cache: "no-store",
        });
        await applyResponse(response, id);
      } catch {
        setStatus("uncertain");
        setMessage(
          "We cannot confirm delivery yet. Keep this reference. Check again before starting another request, as the original may still reach the office.",
        );
      } finally {
        setChecking(false);
      }
    },
    [applyResponse],
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      let prior: string | null = null;
      try {
        prior = sessionStorage.getItem(storageKey);
      } catch {
        /* Optional recovery only. */
      }
      if (!prior || !uuid.test(prior)) {
        setStatus("idle");
        return;
      }
      requestId.current = prior;
      setReference(prior);
      await checkDelivery(prior);
    });
    return () => {
      active = false;
    };
  }, [checkDelivery]);

  async function sendSnapshot() {
    if (!snapshot.current || !requestId.current) return;
    const id = requestId.current;
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot.current),
        signal: AbortSignal.timeout(12000),
      });
      // A locally rejected input has never reached the delivery adapter. Unlock it
      // for correction; uncertain network/upstream results keep the original body.
      if (response.status === 400) {
        const data = await response.clone().json();
        if (
          data.retained === false &&
          ["check_required_fields", "invalid_request", "invalid_request_id"].includes(data.code)
        ) {
          setStatus("error");
          setMessage(
            "Check the required fields, including a phone number with at least 10 digits and your contact permission.",
          );
          requestId.current = null;
          snapshot.current = null;
          setCanRetry(false);
          setReference(null);
          remember(null);
          return;
        }
      }
      await applyResponse(response, id);
    } catch {
      setStatus("uncertain");
      setMessage(
        "We could not confirm delivery. Your details are still here. Retry this same request or check its delivery status; both keep the original reference.",
      );
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || !["idle", "error"].includes(status)) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const id = crypto.randomUUID();
    requestId.current = id;
    setReference(id);
    remember(id);
    snapshot.current = {
      ...values,
      requestId: id,
      intent,
      contactConsent: values.contactConsent === "on",
    };
    setCanRetry(true);
    await sendSnapshot();
  }

  function startSeparate() {
    if (status !== "saved" && !allowSeparate) return;
    formRef.current?.reset();
    requestId.current = null;
    snapshot.current = null;
    setCanRetry(false);
    remember(null);
    setReference(null);
    setMessage("");
    setStatus("idle");
    setAllowSeparate(false);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>("#name")?.focus());
  }

  return (
    <form
      className="request-form"
      onSubmit={submit}
      ref={formRef}
      aria-busy={status === "sending" || checking}
    >
      <fieldset
        className="request-fields"
        disabled={!enabled || status === "sending"}
        hidden={held || status === "restoring"}
      >
        <legend className="visually-hidden">Service request details</legend>
        <div className="form-row">
          <div className="field">
            <label htmlFor="name">Your name *</label>
            <input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone number *</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              minLength={10}
              maxLength={30}
              autoComplete="tel"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="email">Email (optional)</label>
            <input id="email" name="email" type="email" maxLength={200} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="service">What can we help with? *</label>
            <select id="service" name="service" required defaultValue="">
              <option value="" disabled>
                Select a service
              </option>
              {site.services.map((item) => (
                <option value={item.slug} key={item.slug}>
                  {item.title}
                </option>
              ))}
              <option value="other">Other / not sure</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="city">City or area *</label>
            <input id="city" name="city" required maxLength={100} autoComplete="address-level2" />
          </div>
          <div className="field">
            <label htmlFor="preferredTime">Preferred day or time (optional)</label>
            <input
              id="preferredTime"
              name="preferredTime"
              maxLength={100}
              placeholder="For example, weekday morning"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="details">Tell us what is happening *</label>
          <textarea
            id="details"
            name="details"
            required
            maxLength={1600}
            placeholder="A few details help our office route your request."
          />
        </div>
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <label className="request-consent" htmlFor="contactConsent">
          <input id="contactConsent" name="contactConsent" type="checkbox" required />
          <span>{CONTACT_CONSENT_TEXT} *</span>
        </label>
        <p className="form-note">
          Your preferred time is a request. An appointment is confirmed only when the office agrees
          it with you.
        </p>
      </fieldset>
      {!enabled && (
        <div className="form-status error" role="status">
          Online request delivery is being connected. Please use the office phone number when
          available.
        </div>
      )}
      {status === "restoring" && (
        <p className="form-note" role="status">
          Checking for an earlier request…
        </p>
      )}
      {message && (
        <div
          className={`form-status ${["error", "review", "uncertain"].includes(status) ? "error" : ""}`}
          role="status"
        >
          {message}
        </div>
      )}
      {reference && (
        <p className="form-note request-reference">
          Request reference: <span>{reference}</span>
        </p>
      )}
      {!held && status !== "restoring" && (
        <button
          className="button button-primary button-large"
          type="submit"
          disabled={!enabled || status === "sending"}
        >
          {status === "sending"
            ? "Sending…"
            : intent === "emergency"
              ? "Send Priority Request"
              : "Send Service Request"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      )}
      {held && status !== "saved" && (
        <>
          <div className="request-actions">
            <button
              className="button button-primary"
              type="button"
              disabled={checking}
              onClick={() => reference && void checkDelivery(reference)}
            >
              {checking ? "Checking…" : "Check delivery status"}
            </button>
            {status === "uncertain" && canRetry && (
              <button
                className="button button-outline"
                type="button"
                disabled={checking || !enabled}
                onClick={() => void sendSnapshot()}
              >
                Retry this request
              </button>
            )}
          </div>
          <div className="request-separate">
            <label className="request-consent" htmlFor="separateRequest">
              <input
                id="separateRequest"
                type="checkbox"
                checked={allowSeparate}
                onChange={(event) => setAllowSeparate(event.target.checked)}
              />
              <span>
                I need a separate request and understand the earlier request may still reach the
                office.
              </span>
            </label>
            <button
              className="button button-outline"
              type="button"
              disabled={!allowSeparate || !enabled || checking}
              onClick={startSeparate}
            >
              Start a separate request
            </button>
          </div>
        </>
      )}
      {status === "saved" && (
        <button
          className="button button-outline"
          type="button"
          disabled={!enabled}
          onClick={startSeparate}
        >
          Start another request
        </button>
      )}
    </form>
  );
}
