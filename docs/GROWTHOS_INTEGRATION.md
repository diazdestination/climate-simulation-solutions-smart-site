# GrowthOS website connection

The site now uses the actual GrowthOS v1 server-only intake contract through the reviewed adapter in `src/lib/website-adapter`. It has been tested locally with synthetic requests; it is not a deployed live connection. The previous draft `smart_site.lead_requested` event and webhook URL/token settings are obsolete.

## Website boundary

`POST /api/requests` requires the exact configured website origin, bounded JSON, valid UUID, an allowlisted service, contact fields, and an explicit unchecked contact-consent checkbox. The server maps the form into GrowthOS rather than accepting tenant or consent-policy claims from the browser. At least ten phone digits are required. Details are capped at 1,600 characters so the requested service, intent, time preference and pending-office-approval statement fit the 2,000-character CRM summary.

| Website service | GrowthOS HVAC service |
|---|---|
| AC repair / heating repair | `repair` |
| System replacement | `replacement` |
| Maintenance | `maintenance` |
| Refrigeration / indoor air quality / other | `not-sure`; original choice retained verbatim in summary |

Emergency intent becomes `urgent` routing; estimate becomes `planning`. All appointments remain `pending_office_approval`; no time slot, dispatch or immediate response is guaranteed.

## Actual upstream request

```text
POST /api/v1/public/smart-sites/<site-id>/intake
Authorization: Bearer <server-only-site-secret>
Content-Type: application/json
x-smart-site-received-at: <original timestamp retained across retries>
```

```json
{
  "schemaVersion": 1,
  "requestId": "browser-generated-uuid-unchanged-on-retry",
  "contact": { "name": "validated name", "phone": "validated phone" },
  "project": {
    "serviceCode": "repair",
    "city": "validated city",
    "summary": "Original intent/service/time preference and request details",
    "timing": "soon"
  },
  "consent": {
    "contact": true,
    "policyVersion": "css-request-contact-v1",
    "channels": ["phone"],
    "analytics": false
  }
}
```

When email is supplied, it and the `email` channel are included. No marketing/SMS/analytics permission is inferred. Exact displayed contact copy lives in `src/lib/request-policy.mjs`, and the configured policy version must match it.

Only a validated 200/201 saved receipt containing a UUID lead ID, UUID receipt ID, duplicate flag, and `staff-inbox` notification becomes a website saved state. These internal identifiers are stripped from public responses. Generic 2xx responses, malformed JSON, timeouts and lost acknowledgements remain unconfirmed/queued. The server stores encrypted intake before sending; a lost acknowledgement retries the same UUID against GrowthOS's durable receipt.

## Guarded connection and operation

The credential check uses `POST /api/v1/public/smart-sites/<site-id>/check` with schema version 1. It creates no lead and does not activate capture. An operator must review credentials and current office staffing in GrowthOS. A missing active responder, disabled site or paused company produces a hold rather than success.

The separate authenticated `/api/internal/growthos` route provides safe check/inspect/drain/retry operations. A private supervised worker performs automatic due retries. `POST /api/requests/status` offers a PII-free opaque-reference lookup so the browser can recover after a reload. Public endpoints have origin/body/rate guards and never expose server keys.

This version requires Node >=22.13 plus a persistent local journal; it is not compatible with Cloudflare Workers or ephemeral serverless filesystems. See [Runbook](../RUNBOOK.md) for retention, capacity, encryption, worker setup, failure review, restoration and external-journal export/deletion requirements.

Future reminders, estimate follow-up, review requests, maintenance campaigns and dispatch must use separately authorized GrowthOS workflows. This website connection does not implement or enable those provider actions.
