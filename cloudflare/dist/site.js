const needs = {
  urgent: {
    label: "Emergency repair",
    title: "Let’s get a real person involved.",
    copy: "Call with your address and a short description of the problem. Emergency-hour requests are handled outside regular weekday hours; technician response depends on availability and location.",
    action: "Call for emergency help",
  },
  repair: {
    label: "Repair & maintenance",
    title: "Start with what your system is doing.",
    copy: "Share the symptoms, system type, and when the issue began. Climate Simulation Solutions can determine whether repair or maintenance is the right next conversation.",
    action: "Talk through the issue",
  },
  install: {
    label: "Installation",
    title: "Plan the system around your space.",
    copy: "Call to discuss the property, comfort goals, and current equipment. Installation estimates are available at no charge; equipment and financing details require a direct conversation.",
    action: "Request an installation estimate",
  },
  commercial: {
    label: "Commercial service",
    title: "Keep comfort and operations moving.",
    copy: "Describe the facility, equipment, and service need. The team can discuss commercial HVAC maintenance and refrigeration scope for your location.",
    action: "Discuss commercial service",
  },
};

document.querySelectorAll(".need-card").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".need-card").forEach((item) => {
      item.classList.toggle("is-active", item === button);
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });
    const selected = needs[button.dataset.need];
    document.querySelector("#resultLabel").textContent = selected.label;
    document.querySelector("#resultTitle").textContent = selected.title;
    document.querySelector("#resultCopy").textContent = selected.copy;
    document.querySelector("#resultAction .action-label").textContent = selected.action;
  });
});

function setHoursStatus() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date()).map((part) => [part.type, part.value])
  );
  const minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute);
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(parts.weekday);
  const regular = weekday && minuteOfDay >= 540 && minuteOfDay < 1020;
  document.querySelector("#hoursStatus").textContent = regular
    ? "Regular hours now · Mon–Fri, 9–5"
    : "Emergency hours now · Call for help";
  document.querySelector("#mobileCallLabel").textContent = regular
    ? "Call during regular hours"
    : "Call for emergency help";
}

setHoursStatus();
setInterval(setHoursStatus, 60000);
document.querySelector("#year").textContent = new Date().getFullYear();
