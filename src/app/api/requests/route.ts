import { deliverLead, type LeadIntent, type LeadRequest } from "@/lib/growthos";
import { site } from "@/lib/site";

const intents: LeadIntent[] = ["booking", "emergency", "estimate", "maintenance"];
const services = new Set<string>([...site.services.map((item) => item.slug), "other"]);
const responseHeaders = { "Cache-Control": "no-store" };
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max + 1) : "";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host)
        return Response.json(
          { error: "Invalid origin" },
          { status: 403, headers: responseHeaders },
        );
    } catch {
      return Response.json({ error: "Invalid origin" }, { status: 403, headers: responseHeaders });
    }
  }
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Expected JSON" }, { status: 415, headers: responseHeaders });
  if (Number(request.headers.get("content-length") || 0) > 8192)
    return Response.json({ error: "Request too large" }, { status: 413, headers: responseHeaders });

  let data: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 8192)
      return Response.json(
        { error: "Request too large" },
        { status: 413, headers: responseHeaders },
      );
    data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid JSON");
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400, headers: responseHeaders });
  }
  if (clean(data.website, 100)) return Response.json({ ok: true }, { headers: responseHeaders });

  const intent = clean(data.intent, 20) as LeadIntent;
  const lead: LeadRequest = {
    intent,
    name: clean(data.name, 100),
    phone: clean(data.phone, 30),
    email: clean(data.email, 200),
    service: clean(data.service, 50),
    city: clean(data.city, 100),
    preferredTime: clean(data.preferredTime, 100),
    details: clean(data.details, 2000),
  };
  if (
    !intents.includes(intent) ||
    !lead.name ||
    !/^[+()\d\s.-]{7,30}$/.test(lead.phone) ||
    (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) ||
    !services.has(lead.service) ||
    !lead.city ||
    !lead.details ||
    lead.name.length > 100 ||
    lead.email.length > 200 ||
    lead.city.length > 100 ||
    lead.preferredTime.length > 100 ||
    lead.details.length > 2000
  ) {
    return Response.json(
      { error: "Check the required fields" },
      { status: 400, headers: responseHeaders },
    );
  }
  const delivered = await deliverLead(lead);
  if (!delivered)
    return Response.json(
      { error: "Request delivery unavailable" },
      { status: 503, headers: responseHeaders },
    );
  return Response.json(
    { ok: true, status: "pending_office_approval" },
    { status: 202, headers: responseHeaders },
  );
}
