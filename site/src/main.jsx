import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./styles.css";
import "./smart-site.css";
import "./home.css";

// Prerendered HTML (scripts/build.mjs) is replaced by the live app; content is identical.
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App pathname={window.location.pathname} />
  </React.StrictMode>,
);
