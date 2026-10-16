import { useState } from "react";
import { FaFire, FaPhone, FaPlugCircleXmark, FaSnowflake, FaDroplet, FaVolumeHigh, FaCircleQuestion, FaTriangleExclamation } from "react-icons/fa6";
import { RequestForm } from "../components/RequestForm.jsx";
import { URGENT_ISSUES } from "../lib/hvacRequest.js";
import { PHONE_DISPLAY, PHONE_LINK } from "../lib/siteFacts.js";
import { trackAcquisition } from "../lib/acquisition.js";

const ICONS = { "no-heat": FaFire, "no-cooling": FaSnowflake, "water-leak": FaDroplet, "noise-and-failure": FaVolumeHigh, "other-urgent": FaCircleQuestion };

// Safety screen first. Any "yes" stops the request flow and shows life-safety steps.
const SAFETY_QUESTIONS = [
  { id: "gas", text: "Do you smell gas (a rotten-egg smell), or is a carbon monoxide (CO) alarm sounding?" },
  { id: "electrical", text: "Is there a burning or electrical smell, smoke, or sparking from the equipment?" },
];

export function SafetyStop({ hazard }) {
  return (
    <div className="safety-stop" role="alert">
      <FaTriangleExclamation aria-hidden="true" />
      {hazard === "gas" ? (
        <div>
          <h3>Leave the home now.</h3>
          <ol>
            <li>Get everyone, including pets, outside right away. Leave the door open behind you.</li>
            <li>Do not switch lights or appliances on or off, use a lighter, or start a car near the home.</li>
            <li>From outside, <strong>call 911</strong> and your gas utility’s emergency line.</li>
            <li>If anyone has a headache, dizziness, nausea or confusion, tell 911 — those can be signs of carbon monoxide.</li>
            <li>Do not go back inside until emergency responders or the gas utility say it is safe. Then call us at <a href={PHONE_LINK}>{PHONE_DISPLAY}</a>.</li>
          </ol>
        </div>
      ) : (
        <div>
          <h3>Shut it off and get away from it.</h3>
          <ol>
            <li>If you can do so safely, turn the system off at the thermostat. Do not open panels or touch wiring, breakers that are hot, or wet equipment.</li>
            <li>If there is smoke, flames or sparking, leave the home and <strong>call 911</strong>.</li>
            <li>Once everyone is safe, call us at <a href={PHONE_LINK}>{PHONE_DISPLAY}</a>.</li>
          </ol>
        </div>
      )}
      <p className="safety-stop__note">This website cannot assess a hazard and does not dispatch anyone. Emergency services come first.</p>
    </div>
  );
}

export function UrgentPage() {
  const [issue, setIssue] = useState("");
  const [answers, setAnswers] = useState({ gas: null, electrical: null });
  const hazard = answers.gas === true ? "gas" : answers.electrical === true ? "electrical" : null;
  const screened = answers.gas === false && answers.electrical === false;
  const selected = URGENT_ISSUES.find((i) => i.id === issue);

  const choose = (id) => {
    setIssue(id);
    trackAcquisition("project_form_opened", { surface: "urgent", step: id });
  };

  return (
    <div className="page page--urgent">
      <section className="page-hero page-hero--urgent">
        <p className="kicker">No heat · No AC · Water leak</p>
        <h1>Urgent heating or cooling problem?</h1>
        <p className="page-hero__lede">The fastest way to reach a person is to call. If no one answers, you can also send an urgent request below so the office has your details and can call you back.</p>
        <a className="button button-primary button-large" href={PHONE_LINK} data-surface="urgent">
          <FaPhone aria-hidden="true" /> Call {PHONE_DISPLAY}
        </a>
        <p className="page-hero__note">We can’t promise an arrival time online. Timing depends on technician availability, your location and the problem.</p>
      </section>

      <section className="triage" aria-labelledby="triage-title">
        <div className="triage-step">
          <span className="triage-step__number">1</span>
          <div>
            <h2 id="triage-title">Safety first</h2>
            {SAFETY_QUESTIONS.map((q) => (
              <fieldset key={q.id} className="safety-question">
                <legend>{q.text}</legend>
                <div className="yes-no">
                  {[
                    [true, "Yes"],
                    [false, "No"],
                  ].map(([value, label]) => (
                    <label key={label} className={`yes-no__option${answers[q.id] === value ? " is-selected" : ""}`}>
                      <input type="radio" name={`safety-${q.id}`} checked={answers[q.id] === value} onChange={() => setAnswers((a) => ({ ...a, [q.id]: value }))} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            {hazard && <SafetyStop hazard={hazard} />}
            <p className="no-diy">
              <FaPlugCircleXmark aria-hidden="true" /> Please don’t attempt refrigerant, gas or electrical repairs yourself. It’s fine to check that the thermostat is set correctly and has power, and that the filter isn’t clogged.
            </p>
          </div>
        </div>

        {!hazard && (
          <div className={`triage-step${screened ? "" : " is-locked"}`} aria-disabled={!screened}>
            <span className="triage-step__number">2</span>
            <div>
              <h2>What’s happening?</h2>
              {!screened && <p className="triage-lock">Answer both safety questions to continue.</p>}
              <div className="issue-grid" role="list">
                {URGENT_ISSUES.map((item) => {
                  const Icon = ICONS[item.id];
                  return (
                    <button key={item.id} type="button" role="listitem" className={`issue-card${issue === item.id ? " is-active" : ""}`} aria-pressed={issue === item.id} disabled={!screened} onClick={() => choose(item.id)}>
                      <Icon aria-hidden="true" />
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </button>
                  );
                })}
              </div>
              {issue === "water-leak" && screened && (
                <p className="inline-hint">
                  <FaTriangleExclamation aria-hidden="true" /> Keep water away from outlets and electrical equipment. If it’s safe, turn the system off at the thermostat and place towels or a container to catch water. Don’t touch wet electrical parts.
                </p>
              )}
            </div>
          </div>
        )}

        {!hazard && screened && selected && (
          <div className="triage-step">
            <span className="triage-step__number">3</span>
            <div>
              <h2>Call now — or send an urgent request</h2>
              <div className="call-first">
                <a className="button button-primary button-large" href={PHONE_LINK} data-surface="urgent">
                  <FaPhone aria-hidden="true" /> Call {PHONE_DISPLAY}
                </a>
                <p>Calling is fastest. If you reach voicemail, leave your name, address and a callback number — and you can also send the request below.</p>
              </div>
              <RequestForm
                kind="urgent"
                key={issue}
                defaults={{ issue }}
                heading={`Urgent request: ${selected.label}`}
                intro="This alerts the office that you need urgent help. It does not dispatch a technician or confirm an arrival time; the office calls you back to talk through next steps."
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
