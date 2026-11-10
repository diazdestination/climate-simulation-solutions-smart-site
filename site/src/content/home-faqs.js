import { HOURS_CONFIRMED, HOURS_TEXT } from "../lib/siteFacts.js";

export const HOME_FAQ = [
  ["Can I book an appointment online?", "You can request a service call and share preferred times. The office then contacts you to confirm the actual appointment — the website never books a confirmed time."],
  ["What if my heat or AC is out right now?", "Use the urgent help page or call. If you smell gas or a carbon monoxide alarm is sounding, leave the home and call 911 or your gas utility first."],
  ["What are your office hours?", `${(HOURS_CONFIRMED ? HOURS_TEXT : "Please call the office for current hours").replace(/\.$/, "")}. Outside normal office hours, urgent calls are handled as emergency-hours requests; response depends on availability and location.`],
  ["Do you work with commercial properties?", "Yes. Services include commercial HVAC maintenance and refrigeration service inquiries. Share the facility and equipment details so the office can confirm fit."],
  ["How do I know if you cover my address?", "The business is based in Dawsonville and serves surrounding communities. Share the service address and the type of work to confirm availability before scheduling."],
];
