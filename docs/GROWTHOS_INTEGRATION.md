# GrowthOS integration boundary

The site sends an intake event only when both private environment variables are configured. The handler at `POST /api/requests` validates input, rejects oversized or cross-origin browser requests, and forwards to the configured HTTPS endpoint. It returns `202` only after that endpoint responds successfully. It does not store or log customer details.

## Draft outgoing event

```json
{
  "event": "smart_site.lead_requested",
  "version": 1,
  "requestId": "generated UUID",
  "occurredAt": "ISO 8601 timestamp",
  "status": "pending_office_approval",
  "lead": {
    "intent": "booking | emergency | estimate | maintenance",
    "name": "customer name",
    "phone": "customer phone",
    "email": "optional email",
    "service": "approved service slug or other",
    "city": "service area",
    "preferredTime": "optional preference",
    "details": "customer message"
  }
}
```

Authentication is an `Authorization: Bearer <token>` header. This payload is a proposed interface, **not proof that a GrowthOS receiver exists or accepts it**. Before enabling forms, agree on the contract with GrowthOS, verify the recipient identity, add durable deduplication using `requestId`, define retention and access for personal data, and test office acknowledgement. Add deployment-level rate limiting and monitoring before public exposure.

## Future lifecycle hooks

GrowthOS can later attach office alerts and emergency triage to `lead_requested`; office approval should create a separate `appointment_confirmed` event. Reminder, estimate follow-up, review request, maintenance, seasonal campaign, and reactivation flows require explicit business rules, customer consent where appropriate, and real provider integration. They are not implemented by this scaffold.
