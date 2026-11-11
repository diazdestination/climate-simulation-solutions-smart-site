// Client-owned compatibility boundary: preserve the pinned core until its next upstream sync.
// Workers rejects redirect:"error" before sending a request. Manual returns 3xx to the core,
// whose existing non-2xx checks reject it without forwarding the ElevenLabs credential.
export function createElevenLabsFetch(fetchImpl = (...args) => globalThis.fetch(...args)) {
  return (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.origin === "https://api.elevenlabs.io" && url.pathname.startsWith("/v1/convai/") && init?.redirect === "error") {
      return fetchImpl(input, { ...init, redirect: "manual" });
    }
    return fetchImpl(input, init);
  };
}
