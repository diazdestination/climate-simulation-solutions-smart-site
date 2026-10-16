// Prerender entry used only by scripts/build.mjs (vite build --ssr). Not shipped to browsers.
import { renderToString } from "react-dom/server";
import { App } from "./App.jsx";
export { ROUTES, routeFor } from "./routes.js";

export const render = (pathname) => renderToString(<App pathname={pathname} />);
