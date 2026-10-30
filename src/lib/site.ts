// DEMO BRAND. Every fact here is a placeholder for the next client. See REMIX.md.
export const site = {
  name: "Northline Heating & Air LLC",
  shortName: "Northline Heating & Air",
  description:
    "Heating, cooling, refrigeration, and indoor air quality service for Tri-County homes and businesses.",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE?.trim() || null,
  serviceAreas: [
    "Riverton & Mason County",
    "Eastbrook & Hale County",
    "Lakeside communities",
    "Greater Tri-County area",
  ],
  services: [
    {
      number: "01",
      title: "AC repair",
      detail: "Help when cooling is not keeping up.",
      slug: "ac-repair",
    },
    {
      number: "02",
      title: "Heating repair",
      detail: "Furnace and heating system service.",
      slug: "heating-repair",
    },
    {
      number: "03",
      title: "System replacement",
      detail: "Explore the right next step for your space.",
      slug: "system-replacement",
    },
    {
      number: "04",
      title: "Maintenance",
      detail: "Tune-ups and ongoing system care.",
      slug: "maintenance",
    },
    {
      number: "05",
      title: "Refrigeration",
      detail: "Service for commercial and restaurant needs.",
      slug: "refrigeration",
    },
    {
      number: "06",
      title: "Indoor air quality",
      detail: "Discuss comfort and air quality concerns.",
      slug: "indoor-air-quality",
    },
  ],
} as const;

export type Testimonial = { quote: string; name: string; source?: string };
// Add only customer-approved quotes with a verifiable source.
export const approvedTestimonials: Testimonial[] = [];
export function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}
