import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./styles.css";
import "./smart-site.css";
import "./home.css";
import "./areas.css";

// iOS Safari only shows a control's :active (pressed) state while the page has a touch listener.
// Every key on the site drops when pressed, so register one empty, passive listener.
document.addEventListener("touchstart", () => {}, { passive: true });

// Prerendered HTML (scripts/build.mjs) is replaced by the live app; content is identical.
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App pathname={window.location.pathname} />
  </React.StrictMode>,
);
