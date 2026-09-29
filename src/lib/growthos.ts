export type LeadIntent = "booking" | "emergency" | "estimate" | "maintenance";
export type LeadRequest = {
  intent: LeadIntent;
  name: string;
  phone: string;
  email: string;
  service: string;
  city: string;
  preferredTime: string;
  details: string;
};

// Boundary for the eventual GrowthOS intake contract. No request is accepted unless
// the delivery endpoint and token are configured and the endpoint acknowledges it.
export async function deliverLead(lead: LeadRequest): Promise<boolean> {
  const endpoint = process.env.GROWTHOS_LEAD_WEBHOOK_URL;
  const token = process.env.GROWTHOS_LEAD_WEBHOOK_TOKEN;
  if (!endpoint || !token) return false;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        event: "smart_site.lead_requested",
        version: 1,
        requestId: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        status: "pending_office_approval",
        lead,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
