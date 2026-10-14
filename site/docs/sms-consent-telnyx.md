# SMS consent and compliance kit (Telnyx) — DRAFT pending counsel review

Status 2026-10-14: **no site may ask for text-message consent yet.** Texting returns to a site's
forms only after every prerequisite below is checked, then `sms.compliantConsentApproved: true`
is set in its config (the schema rejects an `sms` channel until then).

## Provider decision (source of record)
- Owner planning, 2026-10-13 (Codex session "Assess Telnyx and Vapi roles", recorded in
  `C:\Forge\artifacts\growthos-two-machine-waves-20261013\DISCOVERY.md`): **Telnyx** for carrier/SMS
  + **ElevenLabs Agents** for voice/text AI + the GrowthOS backend; Vapi optional/not needed.
- Not implemented: GrowthOS still has Twilio SMS code and no Telnyx adapter or provider contract.
  Telnyx account access exists (nonsecret record on GEEKOM: `dev\jarvis\integrations\telnyx\CONNECTION-STATE`)
  but access is not delivery evidence.
- **Correction to the planning note "Telnyx bypasses the verification":** it does not. US carriers
  require registration for application-to-person texting on every provider. Telnyx states that
  unregistered 10DLC traffic has been blocked since February 3, 2025; toll-free numbers need
  toll-free verification instead (Telnyx: "10DLC and toll free text messaging compliance guide").

## Registration path (pick one per client; Codex/Adam execute in the Telnyx portal)
| Path | What it is | Trade-offs |
|---|---|---|
| **10DLC** (local number) | Brand (business) vetted by The Campaign Registry + campaign reviewed by carriers; trust score sets throughput | Local area code customers recognize; brand vetting 1–7 business days; campaign rejections usually from sample messages or missing opt-out language |
| **Toll-free verification** | Verify a toll-free number for messaging | Telnyx calls it faster/cheaper; higher per-message cost; less local feel; new business-registration-number fields required from Jan 2026 |

Recommended starting campaign use case: **Customer Care / account notifications** (missed-call
follow-up, appointment scheduling and reminders, estimate follow-up for an existing request).
Marketing/promotional texts are a separate, stricter campaign and consent — do not mix them in.

## Prerequisites checklist (all required before "text" returns to a form)
- [ ] Client legal business name, EIN/registration number, address and website match the brand
      registration exactly.
- [ ] 10DLC brand + campaign approved (or toll-free number verified) in Telnyx; number assigned to
      the campaign/messaging profile.
- [ ] Privacy policy contains the mobile-data clause below and the site links it next to the box.
- [ ] Terms/SMS program terms page exists (program name, frequency, rates, STOP/HELP, support contact).
- [ ] GrowthOS implements STOP/HELP keywords, opt-out suppression across channels, and the HELP
      reply; quiet hours enforced in the recipient's local time.
- [ ] Sample messages in the campaign match what GrowthOS will actually send.
- [ ] Counsel reviewed the wording (TCPA and state rules; some states set stricter hours or rules).

## Consent checkbox (separate, unchecked, optional — never bundled with the contact consent)
> ☐ **Text me about this request.** By checking this box, I agree to receive text messages from
> **[Company name]** about my service request, appointment scheduling and reminders, and estimate
> follow-up at the mobile number I provided. Message frequency varies. Message and data rates may
> apply. Reply **STOP** to opt out or **HELP** for help. Consent is not a condition of purchase.
> See our [Privacy Policy](/privacy/) and [SMS Terms](/sms-terms/).

Store with the lead: the exact text version (policy id, e.g. `css-sms-care-v1`), timestamp, the
phone number, and the page; send `channels` including `"sms"` only when this box is checked.

## Privacy-policy clause (carriers check for it)
> **Text messages.** If you opt in to text messages, we use your mobile number only to send the
> messages you agreed to. We do not sell or share your mobile number or text-messaging opt-in data
> with third parties or affiliates for their marketing purposes. Our messaging provider processes
> messages on our behalf. Reply STOP to any message to opt out, or HELP for help.

## Required automatic replies (GrowthOS sends; examples)
- First message after opt-in: "[Company]: Thanks! You'll get texts about your service request.
  Msg freq varies. Msg&data rates may apply. Reply HELP for help, STOP to opt out."
- HELP: "[Company]: For help call [phone] or email [email]. Msg&data rates may apply. Reply STOP to
  opt out."
- STOP: "[Company]: You're unsubscribed and won't receive more texts. Reply START to resubscribe."
  (STOP must also suppress automated texts across every GrowthOS workflow.)

## Missed-call text-back and after-hours replies (GrowthOS)
- A missed call is **not** written consent to automated texting. Treat the first text-back as a
  single, transactional reply to the caller's own contact attempt, include the brand and opt-out,
  and send nothing further unless the caller replies or opts in. **Counsel and the campaign
  description must cover this flow before it is enabled.**
- Quiet hours: no automated texts outside 8 a.m.–9 p.m. recipient local time (federal TCPA
  baseline); some states are stricter. GrowthOS already has sending-hours settings to build on.
- After-hours auto-replies say when the office will respond; never promise arrival times.

## Live phone-call voice answering
Post-launch roadmap (ElevenLabs on a real phone line through the carrier). Not part of launch.
