import { Suspense, lazy, useEffect, useState } from "react";
import { FaBars, FaPhone, FaXmark } from "react-icons/fa6";
import { MeasurementChoices } from "./MeasurementChoices.jsx";
// The ElevenLabs SDK is large: load the assistant desk only when a visitor opens it.
const VoiceDesk = lazy(() => import("./VoiceDesk.jsx").then((m) => ({ default: m.VoiceDesk })));
import { BRAND_NAME, HOURS_CONFIRMED, HOURS_FALLBACK, HOURS_TEXT, LOCATION, PHONE_DISPLAY, PHONE_LINK, officeStatus } from "../lib/siteFacts.js";

const LOGO = "/assets/css-logo-transparent.png";
const NAV = [
  ["/urgent/", "Urgent help"],
  ["/book-service/", "Book service"],
  ["/maintenance-plans/", "Maintenance plans"],
  ["/estimate-follow-up/", "Estimates"],
  ["/service-areas/", "Service area"],
];

export function Brand({ footer = false }) {
  return (
    <a className={`brand${footer ? " footer-brand" : ""}`} href="/" aria-label={`${BRAND_NAME} home`}>
      <img className="brand-logo" src={LOGO} width="1254" height="1254" alt="" decoding="async" />
      <span className="brand-copy">
        <strong>Climate Simulation</strong>
        <span>Solutions</span>
      </span>
    </a>
  );
}

/** Neutral until hours are confirmed: never shows a guessed schedule. */
export function HoursLine() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const tick = () => setStatus(officeStatus());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  if (!HOURS_CONFIRMED) return <span>{HOURS_FALLBACK}</span>;
  return <span>{status === "office-open" ? `Office open now · ${HOURS_TEXT}` : `Outside office hours · urgent calls handled as emergency hours`}</span>;
}

export function Layout({ children, currentPath, initialAssistantOpen = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(initialAssistantOpen);
  const [year, setYear] = useState("");
  useEffect(() => setYear(String(new Date().getFullYear())), []);
  useEffect(() => {
    const open = () => setAssistantOpen(true);
    window.addEventListener("css-open-assistant", open);
    return () => window.removeEventListener("css-open-assistant", open);
  }, []);

  return (
    <div className="site">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <Brand />
        <nav className={`site-nav${menuOpen ? " is-open" : ""}`} aria-label="Primary navigation" id="site-nav">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} aria-current={currentPath === href ? "page" : undefined}>{label}</a>
          ))}
          <button type="button" className="nav-assistant" onClick={() => setAssistantOpen(true)} data-acquisition-event="voice_assistant_opened" data-surface="nav">
            AI assistant
          </button>
        </nav>
        <div className="header-actions">
          <a className="header-call" href={PHONE_LINK} data-surface="header">
            <span>Call now</span>
            <strong>{PHONE_DISPLAY}</strong>
          </a>
          <button type="button" className="menu-toggle" aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <FaXmark aria-hidden="true" /> : <FaBars aria-hidden="true" />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer className="site-footer">
        <Brand footer />
        <div className="footer-meta">
          <p>{LOCATION.city}, Georgia</p>
          <p><HoursLine /></p>
          <a href={PHONE_LINK} data-surface="footer">{PHONE_DISPLAY}</a>
        </div>
        <div className="footer-links">
          <a href="/urgent/">Urgent help</a>
          <a href="/book-service/">Book service</a>
          <a href="/maintenance-plans/">Maintenance plans</a>
          <a href="/estimate-follow-up/">Estimate questions</a>
          <a href="/services/emergency-hvac-repair/">Services</a>
          <a href="/service-areas/">Service area</a>
          <a href="/privacy/">Privacy</a>
        </div>
        <p className="copyright">© <span>{year}</span> {BRAND_NAME}. Online requests are not confirmed appointments; the office confirms scheduling directly.</p>
      </footer>

      <a className="mobile-call" href={PHONE_LINK} data-surface="mobile-bar">
        <span><FaPhone aria-hidden="true" /> Call {BRAND_NAME}</span>
        <strong>{PHONE_DISPLAY}</strong>
      </a>
      <MeasurementChoices />
      {assistantOpen && (
        <Suspense fallback={null}>
          <VoiceDesk isOpen onClose={() => setAssistantOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}

export const openAssistant = () => window.dispatchEvent(new CustomEvent("css-open-assistant"));
