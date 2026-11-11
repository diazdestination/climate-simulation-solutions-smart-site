# CSS text assistant activation — November 10, 2026

Public text chat is connected at https://csshvac.com/. Adam separately approved creation of
the missing CSS agent, encrypted runtime-key storage, public text activation, and the provider's
required ElevenAgents Write scope. Spoken voice remains disabled.

## Production receipt

- Worker: `climate-simulation-solutions-site` in account `4d9480db003a5c1e601c5dfac0d66505`.
- Active version: `33de63cb-72ed-466e-b39a-a375fca81f2c`, 100% traffic.
- Deployment: `28c31b57-b7fb-4b9c-a0c9-9e473734b183` (November 10 Pacific time).
- Rollback to closed chat: `2b4f2c7a-470b-436b-a49b-4f10662aa596`.
- Exact deployed module SHA-256: `15f4e6843a6d247ca0fa8036679ecb088f5383921ae3fdbd978314e3898ec5ef`.
- Dedicated CSS agent: `agent_3301m73gbx5kfh1bp0h1nssgba8k`, with three CSS knowledge documents
  and three dedicated client tools. Other agents and their tools were not modified.
- Runtime key: `CSS HVAC Website — Runtime`; only ElevenAgents Write, 20,000 credits per refresh
  period, automatic leaked-key disable enabled. Stored only in CSS Worker encrypted secrets as
  `ELEVENLABS_API_KEY`; agent ID stored as `ELEVENLABS_AGENT_ID`. No values are in this repository.

The agent requires authentication and is text-only, limited to 15 conversations/day, two concurrent
sessions, and 600 seconds/session. Bursting and audio recording are off; retention is one day and
transcript/PII deletion is enabled. These limits supplement the site's Turnstile and per-IP limits.

The current single-seat plan cannot restrict a user key to one client agent. Its ElevenAgents
permission spans accessible workspace agents; Adam explicitly approved that limitation. For future
client isolation, use client-owned workspaces or resource-scoped service accounts on a suitable
plan. No plan upgrade, top-up, telephone connection, or customer contact occurred.

## Deployment scope and compatibility fix

The release used the downloaded live server, changing only `voice.public` to true and the two
assistant provider fetch options from `redirect: "error"` to `"manual"`. Cloudflare Workers rejects
the error redirect mode before sending a request. Manual mode returns redirects to the existing
non-2xx checks, which reject them without forwarding the API credential.

The first activation was rolled back when a real browser test exposed that incompatibility. The
corrected version then passed the live test. Existing frontend assets, database binding, lead email
settings, other secrets, schedules, runtime settings, and domains were preserved. The full Git
worker and its outdoor-temperature endpoint were not deployed; `/api/outdoor` still returns 404.
Do not deploy bare `site/wrangler.jsonc`: retain the live Secrets Store references as described in
the homepage deployment brief.

The source equivalent lives in the client-owned `worker/elevenlabs-fetch.js` adapter. The vendored
core remains identical to its pinned upstream manifest. The source worker also contains unrelated,
unreleased outdoor logic, so this branch is not the exact production bundle and must not be
deployed wholesale without a separate review.

## Verification

- Actual public browser: signed-session endpoint HTTP 200, text session connected, first message
  identified the assistant as AI. A synthetic setup question returned `(706) 502-0877`, weekdays
  9 a.m.–5 p.m., and weekends 8 a.m.–6 p.m. Session ended; no service request was submitted.
- Status: `ready:true`, `localOnly:false`, modes `{text:true,voice:false}`.
- Session request without a bot token: HTTP 403, `bot_check_required`.
- Lead readiness: HTTP 200, `email_ready`, customer confirmations disabled.
- Source build completed; 62/62 tests passed, including provider redirects rejected, successful
  text sessions, voice disabled, and pinned core unchanged. No evidence-file upload was exercised.
- Evidence and nonsecret receipts: `C:\Forge\artifacts\css-living-hero-20261110\assistant-activation-completion.json`,
  `assistant-runtime-fix-verification.json`, and `css-live-chat-facts.png`.

This supersedes the earlier assumption that an existing CSS assistant was serving stale facts.
There was no CSS agent in the connected workspace and the live endpoint was unconfigured before
the separately approved provisioning. The homepage release record describes its earlier state.
