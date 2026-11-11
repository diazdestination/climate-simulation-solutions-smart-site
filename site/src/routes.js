// Route table shared by the browser entry, the prerenderer and tests. Every route is
// prerendered to dist/<path>/index.html (the Cloudflare adapter serves route-only fallback).
import { AREA_PAGES, SERVED_COMMUNITIES, SERVICE_PAGES, areaPath, servicePath } from "./content/pages.js";

export const ROUTES = [
  {
    path: "/",
    page: "home",
    title: "Climate Simulation Solutions | HVAC Service in Dawsonville, GA",
    description: "Heating, cooling and refrigeration service for homes and businesses in Dawsonville and surrounding North Georgia communities. Book a service call or get urgent help.",
  },
  {
    path: "/urgent/",
    page: "urgent",
    title: "No Heat, No AC or Water Leak? Urgent HVAC Help | Climate Simulation Solutions",
    description: "Urgent heating and cooling help: safety steps first, then call or send an urgent request. No arrival time is promised online.",
  },
  {
    path: "/book-service/",
    page: "book",
    title: "Book a Service Call | Climate Simulation Solutions",
    description: "Request a heating, cooling or refrigeration service call. Choose preferred times; the office contacts you to confirm the appointment.",
  },
  {
    path: "/maintenance-plans/",
    page: "maintenance",
    title: "HVAC Maintenance Plans | Climate Simulation Solutions",
    description: "Residential maintenance plans with a visit every six months and commercial plans with quarterly visits, billed annually. Pricing from the office.",
  },
  {
    path: "/estimate-follow-up/",
    page: "estimate",
    title: "Questions About Your Estimate | Climate Simulation Solutions",
    description: "What happens after you receive an HVAC estimate from Climate Simulation Solutions, and how to ask the office a question about it.",
  },
  {
    path: "/assistant/",
    page: "assistant",
    title: "AI Website Assistant (Preview) | Climate Simulation Solutions",
    description: "A private-preview AI assistant that helps organize a heating or cooling question. It does not diagnose, quote or book.",
    noindex: true,
  },
  {
    path: "/service-areas/",
    page: "areas",
    title: "Service Areas | Climate Simulation Solutions, Dawsonville GA",
    description: `HVAC service in Dawsonville, ${SERVED_COMMUNITIES.slice(0, -1).join(", ")} and ${SERVED_COMMUNITIES.at(-1)}, Georgia.`,
  },
  ...SERVICE_PAGES.map((p) => ({ path: servicePath(p.slug), page: "content", content: p, title: p.title, description: p.metaDescription })),
  ...AREA_PAGES.map((p) => ({ path: areaPath(p.slug), page: "area", content: p, title: p.title, description: p.metaDescription })),
];

const normalize = (pathname) => {
  const clean = String(pathname || "/").split(/[?#]/)[0].replace(/\/index\.html$/, "/");
  return clean.endsWith("/") ? clean : `${clean}/`;
};

export function routeFor(pathname) {
  const path = normalize(pathname);
  return ROUTES.find((r) => r.path === path) ?? null;
}
