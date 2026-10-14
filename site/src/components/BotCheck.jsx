import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile, rendered only when the server reports a site key. Local previews and
// unconfigured hosts render nothing and the server does not require a token.
let settingsPromise;
let scriptPromise;

export function loadProtectionSettings() {
  settingsPromise ??= fetch("/api/protection", { headers: { accept: "application/json" } })
    .then((response) => response.json())
    .then((result) => ({ turnstileSiteKey: typeof result?.turnstileSiteKey === "string" ? result.turnstileSiteKey : null }))
    .catch(() => ({ turnstileSiteKey: null }));
  return settingsPromise;
}

// Test hook: forget cached settings/script between scenarios.
export function resetBotCheckCache() {
  settingsPromise = undefined;
  scriptPromise = undefined;
}

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error("bot_check_unavailable"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Returns { required, token, element, reset }. `required` is true once a site key is known;
 * callers keep submit disabled until `token` is set.
 *
 * The widget is created when its container element actually mounts (a callback ref), not when
 * the hook first runs: forms that show the container only on a later step (the damage check's
 * step 2) still get a widget and a token.
 */
export function useBotCheck(action) {
  const [siteKey, setSiteKey] = useState(null);
  const [container, setContainer] = useState(null);
  const [token, setToken] = useState("");
  const widget = useRef(null);
  const containerRef = useCallback((node) => setContainer(node), []);

  useEffect(() => {
    let cancelled = false;
    loadProtectionSettings().then(({ turnstileSiteKey }) => {
      if (!cancelled) setSiteKey(turnstileSiteKey);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!siteKey || !container) return undefined;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || widget.current !== null) return;
        widget.current = turnstile.render(container, {
          sitekey: siteKey,
          action,
          appearance: "interaction-only",
          callback: (value) => setToken(value),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => setToken(""));
    return () => {
      cancelled = true;
      if (widget.current !== null) window.turnstile?.remove?.(widget.current);
      widget.current = null;
      setToken("");
    };
  }, [siteKey, container, action]);

  const reset = () => {
    setToken("");
    if (widget.current !== null) window.turnstile?.reset?.(widget.current);
  };

  return { required: Boolean(siteKey), token, reset, element: <div className="bot-check" ref={containerRef} /> };
}

/** Hidden field real visitors never see or fill; bots that fill every input are rejected. */
export function HoneypotField({ value, onChange }) {
  return (
    <label className="visually-hidden-field" aria-hidden="true">
      Website
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
