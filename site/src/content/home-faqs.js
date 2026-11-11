import { HOURS_CONFIRMED, HOURS_TEXT } from "../lib/siteFacts.js";
import { SERVED_COMMUNITIES } from "./pages.js";

export const HOME_FAQ = [
  ["Can I book an appointment online?", "You can request a service call and share preferred times. The office then contacts you to confirm the actual appointment — the website never books a confirmed time."],
  ["What if my heat or AC is out right now?", "Use the urgent help page or call. If you smell gas or a carbon monoxide alarm is sounding, leave the home and call 911 or your gas utility first."],
  ["What are your office hours?", `${(HOURS_CONFIRMED ? HOURS_TEXT : "Please call the office for current hours").replace(/\.$/, "")}. Outside normal office hours, urgent calls are handled as emergency-hours requests; response depends on availability and location.`],
  ["Do you work with commercial properties?", "Yes. Services include commercial HVAC maintenance and refrigeration service inquiries. Share the facility and equipment details so the office can confirm fit."],
  ["Do you serve my area?", `The business is based in Dawsonville and serves ${SERVED_COMMUNITIES.slice(0, -1).join(", ")} and ${SERVED_COMMUNITIES.at(-1)}. Somewhere else nearby? Call with the service address and the office will tell you whether we can help.`],
];
