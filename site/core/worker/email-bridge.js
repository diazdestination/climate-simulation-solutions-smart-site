// OPTIONAL legacy email bridge (Microsoft Graph client-credentials). Generic port of
// the Painless reference worker's email path. It exists only for sites that are NOT
// connected to GrowthOS. Whenever growthOSOwnsLeadAutomations() is true it reports
// not-ready and can never send, so a lead is never alerted or confirmed twice.
import { normalizeEnv } from "./env.js";
import { growthOSOwnsLeadAutomations } from "./growthos-connector.js";
import {
  UUID,
  json,
  readBoundedJson,
  BodyTooLargeError,
  fetchSignalOptions,
  isCrossSite,
  safeResponseJson,
} from "./http.js";

function isEmail(value) {
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "")) &&
    String(value).length <= 254
  );
}

export function emailBridgeConfiguration(rawEnv, siteConfig) {
  const env = normalizeEnv(rawEnv);
  if (growthOSOwnsLeadAutomations(env, siteConfig))
    return { ready: false, customerConfirmationEnabled: false, sender: "", recipients: [] };
  const recipients = String(env.SITE_EMAIL_INTERNAL_RECIPIENTS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(isEmail);
  const sender = String(env.SITE_EMAIL_SENDER ?? "").trim().toLowerCase();
  const present = Boolean(
    env.MICROSOFT_TENANT_ID &&
      env.MICROSOFT_CLIENT_ID &&
      env.MICROSOFT_CLIENT_SECRET &&
      isEmail(sender) &&
      recipients.length,
  );
  return {
    ready: siteConfig?.emailBridge?.enabled === true && env.SITE_EMAIL_ENABLED === "true" && present,
    customerConfirmationEnabled: env.SITE_EMAIL_CUSTOMER_CONFIRMATION === "true",
    sender,
    recipients,
  };
}

async function graphToken(env, fetchImpl) {
  const response = await fetchImpl(
    `https://login.microsoftonline.com/${encodeURIComponent(env.MICROSOFT_TENANT_ID)}/oauth2/v2.0/token`,
    {
      method: "POST",
      redirect: "error",
      ...fetchSignalOptions(8_000),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.MICROSOFT_CLIENT_ID,
        client_secret: env.MICROSOFT_CLIENT_SECRET,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
      }),
    },
  );
  const payload = response.ok ? await safeResponseJson(response) : null;
  if (!payload?.access_token) throw new Error("microsoft_authorization_failed");
  return payload.access_token;
}

async function sendMail({ accessToken, sender, recipients, subject, content, replyTo }, fetchImpl) {
  const message = {
    subject,
    body: { contentType: "Text", content },
    toRecipients: recipients.map((address) => ({ emailAddress: { address } })),
    ...(replyTo && isEmail(replyTo) ? { replyTo: [{ emailAddress: { address: replyTo } }] } : {}),
  };
  const response = await fetchImpl(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: "POST",
      redirect: "error",
      ...fetchSignalOptions(8_000),
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ message, saveToSentItems: true }),
    },
  );
  if (!response.ok) throw new Error("microsoft_mail_send_failed");
}

const factValue = (fact) => (fact && typeof fact === "object" ? fact.display ?? fact.value : fact);

export async function handleEmailBridgeLead(request, rawEnv, siteConfig, fetchImpl = fetch) {
  const env = normalizeEnv(rawEnv);
  const configuration = emailBridgeConfiguration(env, siteConfig);
  if (request.method === "GET")
    return json({
      ready: configuration.ready,
      customerConfirmationEnabled: configuration.ready && configuration.customerConfirmationEnabled,
      code: configuration.ready ? "email_ready" : "email_not_configured",
    });
  if (request.method !== "POST")
    return json({ ready: false, code: "method_not_allowed" }, 405, { allow: "GET, POST" });
  if (isCrossSite(request, { requireOriginHeader: siteConfig?.growthos?.requireOriginHeader === true }))
    return json({ code: "cross_site_request_rejected" }, 403);
  let payload;
  try {
    payload = await readBoundedJson(request, 12_000);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return json({ ready: false, code: "request_too_large" }, 413);
    return json({ ready: false, code: "invalid_json" }, 400);
  }
  const g = siteConfig?.growthos ?? {};
  if (payload?.tenantKey !== g.tenantKey || payload?.source !== g.sourceKey)
    return json({ ready: false, code: "lead_source_invalid" }, 400);
  if (payload?.consent?.contactAuthorized !== true)
    return json({ ready: false, code: "contact_consent_required" }, 400);
  const lead = {
    name: String(payload?.contact?.name ?? "").trim(),
    phone: String(payload?.contact?.phone ?? "").trim(),
    email: String(payload?.contact?.email ?? "").trim().toLowerCase(),
    postalCode: String(payload?.project?.postalCode ?? "").trim(),
    serviceCode: String(payload?.project?.serviceCode ?? "").trim(),
    summary: String(payload?.project?.summary ?? "").trim(),
    address: [payload?.project?.address, payload?.project?.city, payload?.project?.state]
      .map((v) => String(v ?? "").trim())
      .filter(Boolean)
      .join(", ")
      .slice(0, 240),
  };
  const formId = String(payload?.formId ?? "").trim();
  const form = g.forms?.[formId];
  // Same vocabulary GrowthOS would record (timingMap), with the visitor's own choice alongside.
  const rawTiming = String(payload?.project?.timing ?? payload?.project?.urgency ?? "").trim().slice(0, 40);
  const mappedTiming = g.timingMap?.[formId]?.[rawTiming];
  lead.timing = mappedTiming && mappedTiming !== rawTiming ? `${mappedTiming} (${rawTiming})` : rawTiming;
  if (lead.name.length < 2 || lead.name.length > 100) return json({ ready: false, code: "name_invalid" }, 400);
  if (lead.phone.replace(/\D/g, "").length < 10 || lead.phone.length > 30) return json({ ready: false, code: "phone_invalid" }, 400);
  if (lead.email && !isEmail(lead.email)) return json({ ready: false, code: "email_invalid" }, 400);
  if (!(form?.serviceCodes ?? g.serviceCodes ?? []).includes(lead.serviceCode)) return json({ ready: false, code: "service_invalid" }, 400);
  if (lead.summary.length > 2000) return json({ ready: false, code: "details_too_long" }, 400);
  if (g.forms && Object.keys(g.forms).length && !form) return json({ ready: false, code: "form_invalid" }, 400);
  if (form?.requirePostalCode && !/^\d{5}$/.test(lead.postalCode)) return json({ ready: false, code: "zip_invalid" }, 400);
  if (!configuration.ready) return json({ ready: false, code: "email_not_configured" }, 503);

  const brand = factValue(siteConfig?.brand?.name) ?? "the team";
  // Retries reuse the browser's requestId, so a duplicate alert carries the same reference.
  const requestId = String(payload?.requestId ?? "");
  const reference = `RQ-${(UUID.test(requestId) ? requestId : crypto.randomUUID()).replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  let accessToken;
  try {
    accessToken = await graphToken(env, fetchImpl);
    await sendMail(
      {
        accessToken,
        sender: configuration.sender,
        recipients: configuration.recipients,
        subject: `New website request — ${reference}`,
        content: [
          `New ${brand} website request — ${reference}`,
          "",
          `Name: ${lead.name}`,
          `Phone: ${lead.phone}`,
          `Email: ${lead.email || "Not provided"}`,
          `Address: ${lead.address || "Not provided"}`,
          `ZIP: ${lead.postalCode || "Not provided"}`,
          ...(formId ? [`Form: ${formId}`] : []),
          `Service: ${lead.serviceCode}`,
          ...(lead.timing ? [`Timing: ${lead.timing}`] : []),
          `Notes: ${lead.summary || "None provided"}`,
          "",
          `The visitor authorized contact about this request${form?.policyVersion ? ` (consent ${form.policyVersion}: ${(form.channels ?? []).join(", ")})` : ""}.`,
          "This alert is not a diagnosis, quote, dispatch or appointment confirmation.",
        ].join("\n"),
        replyTo: lead.email,
      },
      fetchImpl,
    );
  } catch {
    return json({ ready: false, code: "email_delivery_unavailable" }, 502);
  }
  let confirmationSent = false;
  if (configuration.customerConfirmationEnabled && lead.email) {
    try {
      await sendMail(
        {
          accessToken,
          sender: configuration.sender,
          recipients: [lead.email],
          subject: `${brand} request received — ${reference}`,
          content: [
            `Hi ${lead.name.split(/\s+/)[0]},`,
            "",
            `${brand} received your request. Your reference is ${reference}.`,
            "A member of the team will review it and follow up using the contact details you provided.",
            "This confirmation is not an appointment, quote or arrival time.",
          ].join("\n"),
        },
        fetchImpl,
      );
      confirmationSent = true;
    } catch {
      /* The internal alert is the source of truth; never invite a duplicate submission. */
    }
  }
  return json({ ready: true, status: "sent", reference, confirmationSent }, 202);
}
