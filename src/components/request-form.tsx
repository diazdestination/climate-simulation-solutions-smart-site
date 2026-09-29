"use client";

import { useState, type FormEvent } from "react";
import { site } from "@/lib/site";

type Intent = "booking" | "emergency" | "estimate" | "maintenance";

export function RequestForm({ intent, enabled }: { intent: Intent; enabled: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || status === "sending") return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, intent }),
      });
      if (!response.ok) throw new Error("Request could not be delivered");
      form.reset();
      setStatus("success");
      setMessage(
        "Your request was received. Our office will review it and contact you. An appointment is not confirmed yet.",
      );
    } catch {
      setStatus("error");
      setMessage(
        "We could not send your request. Please try again later or call the office if a phone number is shown.",
      );
    }
  }

  return (
    <form className="request-form" onSubmit={submit}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="name">Your name *</label>
          <input id="name" name="name" required maxLength={100} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone number *</label>
          <input id="phone" name="phone" type="tel" required maxLength={30} autoComplete="tel" />
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
          maxLength={2000}
          placeholder="A few details help our office route your request."
        />
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="form-note">
        Submitting asks our office to contact you about this request. Your requested time is not an
        appointment until the office confirms it.
      </p>
      {!enabled && (
        <div className="form-status error" role="status">
          Online request delivery is being connected. Please use the office phone number when
          available.
        </div>
      )}
      {message && (
        <div className={`form-status ${status === "error" ? "error" : ""}`} role="status">
          {message}
        </div>
      )}
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
    </form>
  );
}
