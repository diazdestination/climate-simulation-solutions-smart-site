# HVAC capture adapter — local implementation, inactive

`capture.js` is the server-side bridge from this client's request form to one
dedicated GrowthOS Smart Site. The static `dist/` build does not contain an API
key, organization ID, site ID or provider account. The form remains hidden until
this adapter responds from the exact configured site origin with `enabled: true`.
This is not deployed, bound to hosting, or connected to a real HVAC tenant.

## Server-only configuration

| Setting | Requirement |
| --- | --- |
| `HVAC_CAPTURE_ENABLED` | Exactly `true` only after the release gates below; otherwise intake is unavailable. |
| `HVAC_PUBLIC_ORIGIN` | Exact HTTPS origin of this client's hosted site, with no path, query, credentials or fragment. |
| `GROWTHOS_API_ORIGIN` | In hosted mode, exactly `https://app.mogulforge.ai`; arbitrary HTTPS hosts are rejected before the site secret can be forwarded. |
| `GROWTHOS_SITE_ID` | Newly provisioned real HVAC Smart Site UUID; never the synthetic local QA fixture. |
| `GROWTHOS_SITE_SECRET` | Current `ss_` site key, stored only in the server's secret store, never in Git, HTML, browser JS or logs. |
| `HVAC_CONTACT_POLICY_VERSION` | Owner-reviewed version identifier matching the disclosure below. |
| `HVAC_CONTACT_DISCLOSURE` | Owner-approved inquiry-only contact disclosure shown next to the required checkbox. It must accurately describe the permitted response channels. |
| `HVAC_LOCAL_PREVIEW` | `true` only for synthetic loopback tests; both origins must then be HTTP loopback. Omit it for a hosted release. |

The adapter rejects browser-provided tenant fields and sends a fixed site-scoped
request to GrowthOS. It records contact permission for this inquiry, not
marketing, analytics or SMS permission. A `saved` response means GrowthOS
returned lead and receipt IDs; it does **not** mean an email/SMS was delivered,
a staff member saw the lead, or an appointment was booked. On an ambiguous
upstream result the browser keeps the same request ID for a same-page retry and
does not display a success claim. Refreshing the page loses that in-memory
retry state, so callers should phone the business rather than submit a changed
request after an uncertain result. There is no durable site-side outage queue.

## Acceptance before enabling

1. Confirm the legal business/approver, actual inquiry response policy,
   privacy/retention rules, approved channels and the real person responsible
   for staff follow-up. Do not transfer consent from the former website.
2. Provision a **new real HVAC** GrowthOS organization and site, approved
   manager and responder, and a server-only key. Do not reuse the synthetic
   HVAC QA fixture or any other contractor's tenant, key, staff or sender.
3. Verify the current GrowthOS release and additive migrations are approved,
   the site has a current credential-only check, and `smart-site-launch-guard-v1`
   allows activation. Record the explicit real-inbox/contact-policy/HTTPS
   attestation; this is still not a public-form test.
4. Bind this Worker and static assets on the **HVAC-only** HTTPS host. Add
   hosting-level abuse controls and operational alerts. Confirm secret storage,
   origin matching, no cross-tenant configuration and a tested disable switch.
5. With client-approved **synthetic** details on the labeled HTTPS site, check
   hidden-when-disabled, a saved lead plus staff task in the correct tenant,
   duplicate retry with one receipt, wrong-origin/injected-field rejection,
   unavailable-upstream wording, and no outbound message or booking claim.
   Confirm an authorized responder can actually find and work the task.
6. Obtain release approval before public enablement. Later test real delivery
   or customer contact only under the separately approved workflow.

## Stop and rollback

If intake is unsafe or the staff path is unattended, set `HVAC_CAPTURE_ENABLED`
to `false` at the hosted server and verify `/api/capture-status` reports
`enabled: false`; the form then remains hidden on new page loads. Also disable
the HVAC Smart Site in GrowthOS if needed, leaving existing records intact for
staff review. Preserve request IDs, receipts and audit evidence. Do not rotate
or delete credentials, discard customer records, retry uncertain sends, or
switch to another contractor's site as an improvised recovery step. A browser
already showing the form may still try to submit; the disabled server path
returns `503` without forwarding and offers the public call link.

Local verification: `npm test` runs synthetic tests only and sends no provider
request. A passing local suite is not hosting, DNS, production or staff-delivery
acceptance.
