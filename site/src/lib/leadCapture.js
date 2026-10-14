// Browser client for the same-origin GrowthOS connector (core/worker/growthos-connector.js).
// Adapted from the smart-site reference client. Rules carried over:
// - one requestId per intended request; reuse it for retries until a terminal result;
// - "saved" only with status "saved" + leadId + reference from the worker;
// - 202 queued / needs-review are honest "received, not yet transferred" states;
// - a local-only "prepared" state is allowed ONLY on a loopback preview, never on a public host,
//   and it never shows a reference number (nothing was sent).
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const LEAD_PATH = "/api/lead";

export function isLoopbackPreview(hostname = globalThis.location?.hostname) {
  return LOOPBACK_HOSTS.has(String(hostname ?? "").toLowerCase());
}

/** Interprets a worker response. Exported for tests. */
export function interpretLeadResponse(status, body, { loopback = isLoopbackPreview() } = {}) {
  if (status === 503 && body?.code === "growthos_not_configured" && loopback) return { status: "prepared-locally" };
  if ((status === 200 || status === 201) && body?.status === "saved" && body?.leadId && body?.reference)
    return { status: "saved", reference: body.reference, duplicate: body.duplicate === true };
  if (status === 200 && body?.status === "delivered" && body?.reference) return { status: "saved", reference: body.reference };
  if (status === 202 && ["queued", "needs-review"].includes(body?.status) && body?.reference)
    return { status: body.status, reference: body.reference };
  // Pre-GrowthOS email fallback: the office was emailed (worker returns 202 only after Graph accepts it).
  if (status === 202 && body?.status === "sent" && body?.reference) return { status: "sent", reference: body.reference };
  if (status === 409) return { status: "error", code: "idempotency_conflict" };
  return { status: "error", code: body?.code || "delivery_unavailable" };
}

export async function submitLead(envelope) {
  let response;
  try {
    response = await fetch(LEAD_PATH, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(envelope),
    });
  } catch {
    return { status: "error", code: "network_unavailable", retryable: true };
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* Non-JSON is a delivery failure. */
  }
  return interpretLeadResponse(response.status, body);
}

export async function getLeadDeliveryStatus() {
  try {
    const response = await fetch(LEAD_PATH, { headers: { accept: "application/json" } });
    if (!response.ok) return { ready: false };
    const result = await response.json();
    return { ready: result?.ready === true };
  } catch {
    return { ready: false };
  }
}
