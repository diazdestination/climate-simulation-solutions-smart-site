// Opt-in, first-party measurement via the same-origin GrowthOS acquisition facade.
// Adapted from the reference implementation. Off unless the visitor allows it; GPC / Do Not
// Track keep it off. No ad networks, no contact details, no transcripts.
const CHOICE_KEY = "css_measurement_choice_v1";
const VISITOR_KEY = "css_measurement_visitor_v1";
const SESSION_KEY = "css_measurement_session_v1";
const QUEUE_KEY = "css_measurement_queue_v1";
const TOUCH_KEY = "css_measurement_touch_v1";
const PENDING_OPT_OUT_KEY = "css_measurement_pending_opt_out_v1";
const CHANGE_EVENT = "css-measurement-change";
// Event names must stay inside the GrowthOS acquisition vocabulary (shared with the reference
// site). HVAC flows reuse the generic form events with a surface label (urgent, service,
// maintenance, estimate) instead of inventing names GrowthOS would reject.
const EVENT_NAMES = new Set([
  "page_view",
  "project_form_opened",
  "project_form_started",
  "voice_assistant_opened",
  "voice_session_started",
  "quiet_text_session_started",
  "phone_link_clicked",
]);

let status = { ready: false, policyVersion: "", retentionDays: 0 };
let flushing = false;
let pageTracked = false;

const read = (storage, key, fallback = null) => {
  try {
    const value = storage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};
const write = (storage, key, value) => {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
const remove = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch {
    /* Privacy controls still change in memory when storage is unavailable. */
  }
};
const notify = () => window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
const cleanLabel = (value, max = 100) => {
  if (typeof value !== "string") return undefined;
  const clean = value.trim().slice(0, max);
  return clean && /^[a-zA-Z0-9_. -]+$/.test(clean) ? clean : undefined;
};
const cleanToken = (value, max = 60) => {
  if (typeof value !== "string") return undefined;
  const clean = value.trim().slice(0, max);
  return clean && /^[a-z0-9-]+$/.test(clean) ? clean : undefined;
};
const path = () =>
  /^\/[a-zA-Z0-9/_-]*$/.test(window.location.pathname)
    ? window.location.pathname
    : "/";

function currentTouch() {
  const saved = read(localStorage, TOUCH_KEY);
  if (saved) return saved;
  const params = new URLSearchParams(window.location.search);
  const touch = {};
  const source = cleanLabel(params.get("utm_source"));
  const medium = cleanLabel(params.get("utm_medium"));
  const campaign = cleanLabel(params.get("utm_campaign"));
  if (source) touch.source = source;
  if (medium) touch.medium = medium;
  if (campaign) touch.campaign = campaign;
  try {
    const host = new URL(document.referrer).hostname;
    if (/^[a-zA-Z0-9.-]{1,200}$/.test(host)) touch.referrerHost = host;
  } catch {
    /* Direct traffic is normal. */
  }
  write(localStorage, TOUCH_KEY, touch);
  return touch;
}

function visitorId() {
  let value = read(localStorage, VISITOR_KEY, "");
  if (!/^[0-9a-f-]{36}$/i.test(value)) {
    value = crypto.randomUUID();
    write(localStorage, VISITOR_KEY, value);
  }
  return value;
}

function sessionId() {
  let value = read(sessionStorage, SESSION_KEY, "");
  if (!/^[0-9a-f-]{36}$/i.test(value)) {
    value = crypto.randomUUID();
    write(sessionStorage, SESSION_KEY, value);
  }
  return value;
}

// Global Privacy Control or Do Not Track keeps optional measurement off, as the privacy
// policy states.
export function browserPrivacySignal() {
  const nav = globalThis.navigator;
  return nav?.globalPrivacyControl === true || nav?.doNotTrack === "1" || globalThis.doNotTrack === "1";
}

export function measurementChoice() {
  if (browserPrivacySignal()) return "declined";
  const choice = read(localStorage, CHOICE_KEY);
  if (!choice || choice.value === "unset") return "unset";
  if (choice.value === "allowed" && choice.policyVersion !== status.policyVersion)
    return "unset";
  return choice.value === "allowed" ? "allowed" : "declined";
}

export function measurementStatus() {
  return { ...status };
}

export function subscribeToMeasurement(callback) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

export async function loadMeasurementStatus() {
  try {
    const response = await fetch("/api/acquisition/status", {
      headers: { accept: "application/json" },
    });
    const result = await response.json();
    status = {
      ready:
        response.ok &&
        result?.ready === true &&
        /^[a-zA-Z0-9._-]{1,80}$/.test(result?.policyVersion ?? ""),
      policyVersion: String(result?.policyVersion ?? ""),
      retentionDays: Number(result?.retentionDays ?? 0),
    };
  } catch {
    status = { ready: false, policyVersion: "", retentionDays: 0 };
  }
  notify();
  if (status.ready) {
    void retryPendingOptOut();
    if (measurementChoice() === "allowed") {
      trackPageView();
      void flushMeasurementQueue();
    }
  }
  return measurementStatus();
}

export function allowMeasurement() {
  if (!status.ready || browserPrivacySignal()) return false;
  write(localStorage, CHOICE_KEY, {
    value: "allowed",
    policyVersion: status.policyVersion,
    chosenAt: new Date().toISOString(),
  });
  visitorId();
  sessionId();
  currentTouch();
  notify();
  trackPageView();
  return true;
}

export function declineMeasurement() {
  write(localStorage, CHOICE_KEY, {
    value: "declined",
    policyVersion: status.policyVersion,
    chosenAt: new Date().toISOString(),
  });
  remove(localStorage, QUEUE_KEY);
  notify();
}

export function getAcquisitionContext() {
  if (!status.ready || measurementChoice() !== "allowed") return null;
  return {
    analyticsConsent: true,
    attribution: { landingPath: path(), ...currentTouch() },
    measurement: {
      visitorId: visitorId(),
      sessionId: sessionId(),
      policyVersion: status.policyVersion,
    },
  };
}

export function trackAcquisition(eventName, details = {}) {
  if (
    !EVENT_NAMES.has(eventName) ||
    !status.ready ||
    measurementChoice() !== "allowed" ||
    navigator.webdriver === true
  )
    return false;
  const event = {
    eventId: crypto.randomUUID(),
    eventName,
    occurredAt: new Date().toISOString(),
    path: path(),
    ...currentTouch(),
  };
  const serviceCode = cleanToken(details.serviceCode);
  const surface = cleanToken(details.surface);
  const step = cleanToken(details.step);
  if (serviceCode) event.serviceCode = serviceCode;
  if (surface) event.surface = surface;
  if (step) event.step = step;
  const queue = read(localStorage, QUEUE_KEY, []);
  const next = [...(Array.isArray(queue) ? queue : []), event].slice(-50);
  write(localStorage, QUEUE_KEY, next);
  void flushMeasurementQueue();
  return true;
}

export function trackPageView() {
  if (pageTracked) return;
  if (trackAcquisition("page_view", { surface: "website" })) pageTracked = true;
}

export async function flushMeasurementQueue() {
  if (flushing || !status.ready || measurementChoice() !== "allowed") return;
  const queue = read(localStorage, QUEUE_KEY, []);
  if (!Array.isArray(queue) || queue.length === 0) return;
  flushing = true;
  const events = queue.slice(0, 20);
  try {
    const response = await fetch("/api/acquisition/events", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schemaVersion: 1,
        consent: true,
        policyVersion: status.policyVersion,
        visitorId: visitorId(),
        sessionId: sessionId(),
        events,
      }),
    });
    if (response.ok) {
      const current = read(localStorage, QUEUE_KEY, []);
      const sent = new Set(events.map((event) => event.eventId));
      write(
        localStorage,
        QUEUE_KEY,
        (Array.isArray(current) ? current : []).filter(
          (event) => !sent.has(event.eventId),
        ),
      );
    }
  } catch {
    /* Pseudonymous events remain bounded locally for a later retry. */
  } finally {
    flushing = false;
  }
}

async function retryPendingOptOut() {
  const pending = read(localStorage, PENDING_OPT_OUT_KEY);
  if (!pending?.visitorId || !status.ready) return false;
  try {
    const response = await fetch("/api/acquisition/opt-out", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: 1, visitorId: pending.visitorId }),
    });
    if (!response.ok) return false;
    remove(localStorage, PENDING_OPT_OUT_KEY);
    notify();
    return true;
  } catch {
    return false;
  }
}

export async function disableAndEraseMeasurement() {
  const priorVisitor = read(localStorage, VISITOR_KEY, "");
  declineMeasurement();
  remove(localStorage, VISITOR_KEY);
  remove(sessionStorage, SESSION_KEY);
  remove(localStorage, TOUCH_KEY);
  pageTracked = false;
  if (!/^[0-9a-f-]{36}$/i.test(priorVisitor)) return true;
  write(localStorage, PENDING_OPT_OUT_KEY, {
    visitorId: priorVisitor,
    requestedAt: new Date().toISOString(),
  });
  const confirmed = await retryPendingOptOut();
  notify();
  return confirmed;
}

export function hasPendingMeasurementErase() {
  return Boolean(read(localStorage, PENDING_OPT_OUT_KEY)?.visitorId);
}

