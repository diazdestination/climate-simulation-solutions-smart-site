import { useEffect, useState } from "react";
import { FaChartLine, FaShieldHalved, FaXmark } from "react-icons/fa6";
import {
  allowMeasurement,
  declineMeasurement,
  disableAndEraseMeasurement,
  hasPendingMeasurementErase,
  loadMeasurementStatus,
  measurementChoice,
  measurementStatus,
  subscribeToMeasurement,
  trackAcquisition,
} from "../lib/acquisition.js";

function snapshot() {
  return { choice: measurementChoice(), status: measurementStatus(), pendingErase: hasPendingMeasurementErase() };
}

// Shown only when GrowthOS reports measurement ready. Default is off; GPC/DNT force off.
export function MeasurementChoices() {
  const [state, setState] = useState(() => ({ choice: "unset", status: { ready: false }, pendingErase: false }));
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const refresh = () => setState(snapshot());
    const unsubscribe = subscribeToMeasurement(refresh);
    void loadMeasurementStatus();
    const onOnline = () => void loadMeasurementStatus();
    const onClick = (event) => {
      const target = event.target.closest?.("a,button");
      if (!target) return;
      if (target.matches('a[href^="tel:"]')) trackAcquisition("phone_link_clicked", { surface: target.dataset.surface || "website" });
      const named = target.dataset.acquisitionEvent;
      if (named) trackAcquisition(named, { surface: target.dataset.surface, serviceCode: target.dataset.serviceCode, step: target.dataset.step });
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("click", onClick);
    return () => {
      unsubscribe();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (!state.status.ready) return null;

  const allow = () => {
    allowMeasurement();
    setNotice("Site measurement is on for this browser.");
    setOpen(false);
  };
  const decline = () => {
    declineMeasurement();
    setNotice("Site measurement is off for this browser.");
    setOpen(false);
  };
  const erase = async () => {
    const confirmed = await disableAndEraseMeasurement();
    setNotice(confirmed ? "Measurement is off and this browser’s saved measurement history was removed." : "Measurement is off. History removal will retry when the connection is available.");
    setOpen(false);
  };

  return (
    <>
      {state.choice === "unset" && (
        <aside className="measurement-banner" aria-labelledby="measurement-title">
          <span className="measurement-banner__icon"><FaChartLine aria-hidden="true" /></span>
          <div>
            <strong id="measurement-title">Help us improve this website?</strong>
            <p>
              With your permission we measure which pages and tools on this site are used, and connect that to a request only if you send one.
              No ad-network tracking, contact details, photos or assistant transcripts are included. History is kept for {state.status.retentionDays} days.
              See our <a href="/privacy/">Privacy Policy</a>.
            </p>
          </div>
          <div className="measurement-banner__actions">
            <button className="button button-primary" type="button" onClick={allow}>Allow site measurement</button>
            <button className="text-button" type="button" onClick={decline}>No thanks</button>
          </div>
        </aside>
      )}
      {state.choice !== "unset" && (
        <button className="measurement-trigger" type="button" onClick={() => setOpen(true)}>
          <FaShieldHalved aria-hidden="true" /> Privacy choices
          {state.pendingErase && <span>Erase pending</span>}
        </button>
      )}
      {open && (
        <section className="measurement-panel" role="dialog" aria-modal="true" aria-labelledby="measurement-panel-title">
          <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close privacy choices"><FaXmark aria-hidden="true" /></button>
          <p className="kicker">First-party privacy</p>
          <h2 id="measurement-panel-title">Your choice, your control.</h2>
          <p>
            Site measurement is <strong>{state.choice === "allowed" ? "on" : "off"}</strong> for this browser. It uses no third-party ad trackers and is not
            combined across other websites.
          </p>
          <div className="measurement-panel__actions">
            {state.choice === "allowed" ? (
              <button className="button button-quiet" type="button" onClick={() => void erase()}>Turn off and erase this browser’s history</button>
            ) : (
              <button className="button button-primary" type="button" onClick={allow}>Allow site measurement</button>
            )}
          </div>
        </section>
      )}
      {notice && <p className="measurement-notice" role="status">{notice}</p>}
    </>
  );
}
