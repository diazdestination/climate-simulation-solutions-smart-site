// Browser client tools the site agent may be given. These run in the visitor's
// browser and only change on-screen state; none submits a lead, books, messages,
// transfers or dispatches. Sites opt in per tool in config.voice.agent.tools.
// A future submit tool must go through the site worker's intake with the same
// requestId/consent and an explicit visitor click (kit/growthos-integration-contract.md).

export const TOOL_REGISTRY = Object.freeze({
  sync_case: Object.freeze({
    name: "sync_case",
    description:
      "Update the browser-only case brief after the visitor states a material fact or after you review evidence they shared. Use only stated or directly observed information; never invent values. This tool does not submit anything.",
    expects_response: true,
    parameters: {
      type: "object",
      property_kind: "object",
      description: "Browser-only case update",
      required: [],
      properties: {
        service_need: {
          type: "string",
          description: "The service the visitor described, in their words, or blank when unknown.",
        },
        urgency: {
          type: "string",
          description: "One of immediate safety concern, needs prompt attention, planning, or uncertain.",
          enum: ["immediate safety concern", "needs prompt attention", "planning", "uncertain"],
        },
        first_noticed: { type: "string", description: "When the visitor said the issue was first noticed." },
        postal_code: { type: "string", description: "The five-digit ZIP code the visitor stated." },
        safety_notes: { type: "string", description: "Concise safety facts or explicit absence of known safety flags." },
        evidence_notes: { type: "string", description: "Concise observations from shared files, preserving uncertainty." },
        summary: { type: "string", description: "A concise plain-language summary using only facts from this conversation." },
      },
    },
  }),
  show_call_path: Object.freeze({
    name: "show_call_path",
    description:
      "Highlight the website's phone path when the visitor reports an immediate safety concern or asks to talk to a person. This never places a call.",
    expects_response: false,
    execution_mode: "post_tool_speech",
  }),
  open_written_request: Object.freeze({
    name: "open_written_request",
    description:
      "Open the website's written service-request form only after the visitor explicitly agrees. This does not submit information; the visitor reviews and sends the form themselves.",
    expects_response: false,
    execution_mode: "post_tool_speech",
  }),
  lookup_official_weather_context: Object.freeze({
    name: "lookup_official_weather_context",
    module: "weatherHail",
    description:
      "Check official-source, property-specific NOAA/NCEI radar-derived hail context only after the visitor explicitly agrees to send the stated property address to the U.S. Census Geocoder and the resulting area and date to NOAA. The website asks for that consent with an on-screen confirmation. Returned data indicate probable radar conditions, not proof of impact, damage, claim eligibility, or coverage.",
    expects_response: true,
    parameters: {
      type: "object",
      property_kind: "object",
      description: "Consent-gated official hail-context lookup",
      required: ["address", "candidate_date", "radius_miles"],
      properties: {
        address: { type: "string", description: "Complete property street address with city, state and ZIP, as the visitor provided it." },
        candidate_date: { type: "string", description: "Visitor-supplied candidate date formatted YYYY-MM-DD." },
        radius_miles: { type: "string", description: "Search radius in miles.", enum: ["5", "10", "15", "25"] },
      },
    },
  }),
});

export const TOOL_NAMES = Object.freeze(Object.keys(TOOL_REGISTRY));
