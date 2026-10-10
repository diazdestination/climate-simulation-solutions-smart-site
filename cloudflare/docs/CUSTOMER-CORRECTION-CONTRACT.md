# Customer details and request status: integration boundary

Updated 2026-10-09. Source-only implementation agreement for review, not a
published feature, provider configuration, or an existing API specification.

## What this Site actually supports

The owner-private Site remains a call-first static guide. Its existing inquiry
form is hidden until the existing same-origin `/api/capture-status` route
returns the explicit enabled flag, valid policy version and reviewed disclosure.
The static deployment does not host that route or `/api/lead`.

The form now lets a visitor review and edit their name, phone, email and service
ZIP before the first submission. It uses the existing inquiry payload without
adding backend fields. This is **not** the requested post-call correction link:
there is no authenticated customer lookup, full service-address field, correction
write route, SMS delivery, or appointment status feed in this Site.

A saved inquiry requires HTTP 200/201, explicit `status: saved`, and valid lead
and receipt UUIDs. It proves the existing adapter returned a durable receipt;
it does not establish that staff saw the inquiry, a message reached a customer,
or a technician visit was scheduled. Lost responses retain the original request
ID in page memory; altered retries must go through the staffed phone path.
Refreshing the page loses that in-memory retry context. No browser storage or
new durable queue is introduced. After a confirmed save, the form cannot send a
second inquiry from that page.

## Recovered operating requirements to connect later

Phone-first intake should capture name, service address, phone and email, then
send an immediate confirmation SMS with a customer correction link. Scheduling
requires an explicit customer yes/no response; absent confirmation, staff must
call, hold or reschedule. Alerts are intended for both Heather and Nathaniel.
These are requirements, not evidence of live sending or permission to provision
resources. Owner spelling and competing 7–5/9–5 hours need reconciliation before
changing business identity or schedule. Existing displayed hours remain intact.

## Backend contract that must be verified before implementation

Do not invent endpoint URLs or add capture fields that the deployed backend
cannot store. Before exposing post-call review/correction, establish:

1. A real HVAC-isolated request record with validated full service address,
   contact details, immutable identity and revision/version. Treat contact
   corrections separately from appointment confirmation or changing consent.
2. A backend-issued, narrowly scoped, short-lived customer access link with
   expiry, revocation, replay protection and appropriate identity verification.
   Do not use a public lead UUID as authorization or put customer data in a URL.
   Keep token values out of logs, analytics, referrers and browser persistence.
   Link lifetime and identity-verification policy require an owner/security
   decision; no duration or authentication implementation is assumed here.
3. Read and correction contracts with documented allowed fields, tenant binding,
   optimistic concurrency and an idempotency key per intended correction.
   Editing a phone/email destination must not silently transfer account access
   or re-enroll a customer in messaging. Retain an auditable before/after record
   with approved access and retention limits.
4. Explicit committed correction receipts. Network failure, timeout, conflict,
   expired link and partial delivery need truthful, separate states. Never claim
   a correction saved merely because a fetch succeeded or SMS was queued.
5. A documented schedule state machine from the real scheduling backend.
   Intake received, staff review, proposed slot, customer yes/no, confirmed
   appointment, held request and reschedule needed are distinct outcomes.
   Only verified backend appointment evidence may produce confirmation copy.
6. A separately authorized SMS sender/contact policy, verified recipients,
   opt-out and quiet-hours rules, staff acknowledgement and alerts. Site receipt
   creation must not be treated as evidence of provider delivery.
7. Supervised, labeled synthetic HTTPS acceptance with the dedicated HVAC tenant,
   real approved staff access, safe retries, cross-tenant denial, expired and
   reused links, changed destination, simultaneous edits, partial failure,
   rejection/no response and complete backend outage.

Keep customer correction UI unavailable until those contracts and gates exist.
Do not publish a disconnected correction form, fake status timeline or invented
booking confirmation. Integration notes belong in source, not the homepage.
