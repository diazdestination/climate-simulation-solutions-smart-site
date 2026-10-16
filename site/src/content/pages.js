// Service and service-area page content. Sources (read-only):
//   climate-hvac-site-v8-source/intake/CLIENT-BRIEF.md (five service categories, Dawsonville base)
//   intake/SERVICE-AREA-PLAN.md (nearby "check availability" list; NOT a dispatch allowlist)
//   intake/DESIGN-DIRECTION.md, evidence/BUSINESS-PROOF.csv (what may not be claimed)
//   C:\Forge\CSS_OWNER_INTAKE_2026-10-09.md (plan cadence, owner-requested area pages)
// Deliberately omitted until approved: reviews/ratings, licensing/insurance, years in business,
// brands, warranties, prices, financing, "free estimate" wording, response or arrival times,
// and any city page other than the Dawsonville base.

export const SERVICE_PAGES = [
  {
    slug: "emergency-hvac-repair",
    serviceCode: "repair",
    title: "Emergency HVAC Repair | Climate Simulation Solutions, Dawsonville GA",
    metaDescription: "Urgent heating and cooling help for homes and businesses around Dawsonville, Georgia: no heat, no AC or water leaking from the system. Call first.",
    eyebrow: "Emergency HVAC repair",
    headline: "No heat, no AC, or water where it shouldn’t be.",
    lede: "When your heating or cooling stops at the worst time, call first. Outside normal office hours, urgent calls are handled as emergency-hours requests.",
    primaryAction: { href: "/urgent/", label: "Get urgent help" },
    sections: [
      {
        title: "What counts as urgent",
        body: [
          "The office treats these as urgent: no heat in cold weather, no air conditioning in hot weather, water leaking from the system, and unusual sounds together with the system not heating or cooling.",
          "If you smell gas or a carbon monoxide alarm is sounding, leave the home and call 911 or your gas utility first. If you notice a burning or electrical smell, turn the system off at the thermostat if it is safe to do so and get away from the equipment.",
        ],
      },
      {
        title: "What happens when you reach out",
        body: [
          "Calling is the fastest way to reach a person. Have the service address, a callback number and a short description ready.",
          "If you send an urgent request online, it goes to the office marked urgent. The website does not dispatch a technician or promise an arrival time; timing depends on availability, location and the problem.",
        ],
      },
    ],
    questions: [
      ["Do you guarantee a response time?", "No. The office responds as quickly as it can, but the website cannot promise an arrival time. Call for the fastest help."],
      ["Should I try to fix it myself?", "Please don’t attempt refrigerant, gas or electrical repairs. Checking that the thermostat is set correctly and has power, and that the air filter isn’t clogged, is fine."],
    ],
  },
  {
    slug: "residential-hvac-installation",
    serviceCode: "replacement",
    title: "Residential HVAC Installation & Replacement | Climate Simulation Solutions",
    metaDescription: "Heating and air conditioning replacement and new installation conversations for homes in Dawsonville and surrounding North Georgia communities.",
    eyebrow: "Residential installation",
    headline: "Plan the system around your home.",
    lede: "Replacing aging equipment or installing a new system starts with a conversation about the property, your comfort goals and the equipment you have now.",
    primaryAction: { href: "/book-service/?issue=replacement", label: "Request an installation visit" },
    sections: [
      {
        title: "Start with what you have",
        body: [
          "It helps to know the type of system, its approximate age and the brand if you can see it on the equipment label. If you don’t know, that’s fine — the office can work through it with you.",
          "Equipment options and pricing are discussed directly with the office after the property and system are reviewed. The website does not quote prices.",
        ],
      },
      {
        title: "After you receive an estimate",
        body: ["If you have questions about an estimate you received, you can call or send an estimate question online. The office follows up by phone or email."],
      },
    ],
    questions: [
      ["Can you tell me online what a new system will cost?", "No. Pricing depends on the property and equipment and comes from the office directly."],
      ["Do you install for businesses too?", "Call to discuss commercial equipment so the office can confirm fit for your facility."],
    ],
    related: "/estimate-follow-up/",
  },
  {
    slug: "hvac-maintenance",
    serviceCode: "maintenance",
    title: "HVAC Maintenance | Climate Simulation Solutions, Dawsonville GA",
    metaDescription: "Ongoing heating and cooling maintenance for North Georgia homes, including maintenance plans with a visit every six months, billed annually.",
    eyebrow: "HVAC maintenance",
    headline: "Keep the system you depend on running the way it should.",
    lede: "Ongoing care and performance checks for residential comfort systems, with a maintenance plan option for regular visits.",
    primaryAction: { href: "/maintenance-plans/", label: "See maintenance plans" },
    sections: [
      {
        title: "Regular visits",
        body: [
          "Residential maintenance plans are built around one visit every six months and are billed annually. Ask the office what a visit includes and current plan pricing.",
          "If your system had major service between visits, the office may adjust when your next maintenance visit is due.",
        ],
      },
    ],
    questions: [["Can I book a one-time tune-up instead?", "Yes — send a service request and choose “Maintenance / tune-up visit,” or call the office."]],
  },
  {
    slug: "commercial-hvac-maintenance",
    serviceCode: "maintenance",
    title: "Commercial HVAC Maintenance | Climate Simulation Solutions",
    metaDescription: "Maintenance for the heating and cooling equipment supporting North Georgia businesses, including quarterly commercial maintenance plans billed annually.",
    eyebrow: "Commercial maintenance",
    headline: "Keep comfort and operations moving.",
    lede: "Maintenance conversations for the heating and cooling equipment behind your business, including a quarterly commercial plan.",
    primaryAction: { href: "/maintenance-plans/?plan=commercial", label: "Ask about a commercial plan" },
    sections: [
      {
        title: "Quarterly commercial plans",
        body: [
          "Commercial maintenance plans are built around quarterly visits and are billed annually. Share the facility, the equipment and how many systems you have so the office can confirm fit and explain current pricing.",
        ],
      },
    ],
    questions: [["Do you work on refrigeration equipment?", "Commercial refrigeration service inquiries are welcome. Describe the equipment so the office can confirm whether it’s a fit."]],
  },
  {
    slug: "refrigeration",
    serviceCode: "not-sure",
    title: "Commercial Refrigeration Service Inquiries | Climate Simulation Solutions",
    metaDescription: "Service inquiries for commercial refrigeration equipment around Dawsonville, Georgia. Describe the equipment so the office can confirm fit.",
    eyebrow: "Refrigeration service",
    headline: "Refrigeration equipment your business relies on.",
    lede: "Service inquiries for commercial refrigeration equipment and operating needs. Describe what you have so the office can confirm whether it’s a fit.",
    primaryAction: { href: "/book-service/?issue=refrigeration", label: "Send a refrigeration inquiry" },
    sections: [
      {
        title: "Help the office help you",
        body: ["Include the type of equipment, the brand and model if visible, what it is doing, and how urgent it is for your operation. If product is at risk right now, call."],
      },
    ],
    questions: [["Is my equipment covered?", "Scope depends on the equipment. Call or send an inquiry so the office can confirm."]],
  },
];

// Nearby communities from SERVICE-AREA-PLAN.md's first-review list (shown on the CSS v8 demo as
// "call to check availability") plus the four cities the owners asked about on Oct 9. None of
// these is a coverage promise. "Forsyth" is omitted: county vs city is unconfirmed.
export const AVAILABILITY_CHECK_COMMUNITIES = ["Dahlonega", "Cumming", "Gainesville", "Jasper", "Ball Ground", "Canton", "Buford", "Alpharetta", "Cleveland", "Roswell", "Johns Creek", "Atlanta"];

// Owner-requested city pages, held until coverage, boundaries and local facts are approved.
export const HELD_AREA_PAGES = [
  { city: "Forsyth", reason: "[CONFIRM] county or city; coverage and dispatch availability" },
  { city: "Roswell", reason: "[CONFIRM] coverage and dispatch availability; local facts" },
  { city: "Cleveland", reason: "[CONFIRM] coverage and dispatch availability; local facts" },
  { city: "Johns Creek", reason: "[CONFIRM] coverage and dispatch availability; local facts" },
  { city: "Atlanta (incl. inner-city)", reason: "[CONFIRM] coverage and dispatch availability; local facts" },
];

export const AREA_PAGES = [
  {
    slug: "dawsonville-ga",
    title: "HVAC Service in Dawsonville, GA | Climate Simulation Solutions",
    metaDescription: "Heating, cooling and refrigeration service from a Dawsonville, Georgia HVAC company for homes and businesses in Dawsonville and surrounding communities.",
    eyebrow: "Dawsonville, Georgia",
    headline: "Heating and cooling service based in Dawsonville.",
    lede: "Climate Simulation Solutions is based in Dawsonville and serves surrounding North Georgia communities. Call with your service address to confirm availability.",
    primaryAction: { href: "/book-service/", label: "Book a service call" },
    sections: [
      {
        title: "Services from the Dawsonville team",
        body: [
          "Emergency HVAC repair, residential installation and replacement, HVAC maintenance, commercial maintenance, and commercial refrigeration service inquiries.",
          "Availability depends on the address, the equipment, timing and the type of work, so the office confirms each request directly.",
        ],
      },
    ],
    questions: [["How do I know if you cover my address?", "Share the service address and the type of work needed. The office confirms availability before scheduling."]],
  },
];

export const servicePath = (slug) => `/services/${slug}/`;
export const areaPath = (slug) => `/service-areas/${slug}/`;
